import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Coords = { latitude: number; longitude: number };
type GameLayerLevel = { ordinal?: number; name?: string };
type GameLayerObjective = { count?: number; event?: string };
type GameLayerReward = { points?: number; credits?: number };
type GameLayerMissionLocation = {
  lat?: number;
  lon?: number;
  actionableDistance?: number;
  viewableDistance?: number;
};
type GameLayerPrizeLocation = {
  lat?: number;
  lon?: number;
  actionableDistance?: number;
  viewableDistance?: number;
};
type GameLayerPlayer = {
  player?: string;
  name?: string;
  imgUrl?: string;
  points?: number;
  credits?: number;
  team?: string;
  level?: GameLayerLevel;
};
type GameLayerTeam = { id?: string; name?: string; imgUrl?: string };
type GameLayerTeamResponse = { team?: GameLayerTeam };
type GameLayerMission = {
  id: string;
  name?: string;
  description?: string;
  imgUrl?: string;
  category?: string;
  priority?: number;
  tags?: string[];
  refreshPeriod?: string;
  period?: string;
  expiresAt?: string;
  active?: { from?: string; to?: string };
  points?: number;
  credits?: number;
  reward?: GameLayerReward;
  objectives?: unknown;
  location?: GameLayerMissionLocation;
};
type MissionAnnotation = {
  mission: GameLayerMission;
  lat: number;
  lon: number;
  distanceMetres: number;
  isActionable: boolean;
  category: Exclude<MarkerCategory, "all">;
};
type GameLayerPrize = {
  id: string;
  name?: string;
  description?: string;
  imgUrl?: string;
  tags?: string[];
  period?: string;
  expirationDate?: string;
  isAvailable?: boolean;
  points?: number;
  credits?: number;
  reward?: GameLayerReward;
  stock?: { redeemed?: number; available?: number; count?: number };
  location?: GameLayerPrizeLocation;
};
type PrizeAnnotation = {
  prize: GameLayerPrize;
  lat: number;
  lon: number;
  distanceMetres: number;
  isActionable: boolean;
  category: Exclude<MarkerCategory, "all">;
};
type IconName = "home" | "mission" | "rewards" | "zap" | "gem";
type MarkerCategory = "all" | "culture" | "food" | "nature" | "adventure" | "nightlife";

const DEFAULT_CENTER: Coords = { latitude: 31.2001, longitude: 29.9187 };
const GAME_LAYER_BASE_URL = "https://api.dev.gamelayer.co/api/v0";
const STADIA_TILE_URL = "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png";
const CARTO_DARK_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const categoryColorMap: Record<Exclude<MarkerCategory, "all">, string> = {
  culture: "#BF5AF2",
  food: "#FF9F0A",
  nature: "#32D74B",
  adventure: "#FF453A",
  nightlife: "#FF375F",
};
const markerFilterChips: { id: MarkerCategory; label: string; icon: string }[] = [
  { id: "all", label: "All", icon: "🗺" },
  { id: "culture", label: "Culture", icon: "🏛️" },
  { id: "food", label: "Food", icon: "🍽️" },
  { id: "nature", label: "Nature", icon: "🌿" },
  { id: "adventure", label: "Adventure", icon: "⚡" },
  { id: "nightlife", label: "Nightlife", icon: "🌙" },
];
const resolveMarkerCategory = (value?: string, tags?: string[]): Exclude<MarkerCategory, "all"> => {
  const combined = `${value ?? ""} ${(tags ?? []).join(" ")}`.toLowerCase();
  if (combined.includes("cult")) return "culture";
  if (combined.includes("food") || combined.includes("rest")) return "food";
  if (combined.includes("nature") || combined.includes("park")) return "nature";
  if (combined.includes("advent") || combined.includes("sport")) return "adventure";
  if (combined.includes("night") || combined.includes("club") || combined.includes("bar")) return "nightlife";
  return "adventure";
};
const TILE_LAYER_OPTIONS: L.TileLayerOptions = {
  subdomains: "abc",
  maxZoom: 19,
  detectRetina: true,
  // Keep more tiles around the viewport to reduce visible loading while panning.
  keepBuffer: 8,
  updateWhenIdle: false,
  updateWhenZooming: true,
};
const ICON_PATHS: Record<IconName, string> = {
  home: "/assets/home.png",
  mission: "/assets/mission.png",
  rewards: "/assets/rewards.png",
  zap: "/assets/zap.png",
  gem: "/assets/gem.png",
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const normalizeObjectives = (value: unknown): GameLayerObjective[] => {
  if (Array.isArray(value)) {
    return value.filter(isRecord).map((entry) => ({
      count: asNumber(entry.count),
      event: asString(entry.event),
    }));
  }

  if (isRecord(value)) {
    if (value.count !== undefined || value.event !== undefined) {
      return [{ count: asNumber(value.count), event: asString(value.event) }];
    }

    return Object.values(value).filter(isRecord).map((entry) => ({
      count: asNumber(entry.count),
      event: asString(entry.event),
    }));
  }

  return [];
};

const normalizeMission = (raw: unknown): GameLayerMission | null => {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  if (!id) return null;

  const reward = isRecord(raw.reward)
    ? { points: asNumber(raw.reward.points), credits: asNumber(raw.reward.credits) }
    : undefined;
  const location = isRecord(raw.location)
    ? {
        lat: asNumber(raw.location.lat),
        lon: asNumber(raw.location.lon),
        actionableDistance: asNumber(raw.location.actionableDistance),
        viewableDistance: asNumber(raw.location.viewableDistance),
      }
    : undefined;

  return {
    id,
    name: asString(raw.name),
    description: asString(raw.description),
    imgUrl: asString(raw.imgUrl),
    category: asString(raw.category),
    priority: asNumber(raw.priority),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === "string") : undefined,
    refreshPeriod:
      asString(raw.refreshPeriod) ??
      asString(raw.period) ??
      (isRecord(raw.refresh) ? asString(raw.refresh.period) : undefined),
    period: asString(raw.period),
    expiresAt: asString(raw.expiresAt),
    active: isRecord(raw.active)
      ? { from: asString(raw.active.from), to: asString(raw.active.to) }
      : undefined,
    points: asNumber(raw.points),
    credits: asNumber(raw.credits),
    reward,
    objectives: raw.objectives,
    location,
  };
};

const normalizePrize = (raw: unknown): GameLayerPrize | null => {
  if (!isRecord(raw)) return null;
  const id = asString(raw.id);
  if (!id) return null;

  const reward = isRecord(raw.reward)
    ? { points: asNumber(raw.reward.points), credits: asNumber(raw.reward.credits) }
    : undefined;
  const location = isRecord(raw.location)
    ? {
        lat: asNumber(raw.location.lat),
        lon: asNumber(raw.location.lon),
        actionableDistance: asNumber(raw.location.actionableDistance),
        viewableDistance: asNumber(raw.location.viewableDistance),
      }
    : undefined;

  return {
    id,
    name: asString(raw.name),
    description: asString(raw.description),
    imgUrl: asString(raw.imgUrl),
    tags: Array.isArray(raw.tags) ? raw.tags.filter((tag): tag is string => typeof tag === "string") : undefined,
    period: asString(raw.period),
    expirationDate:
      asString(raw.expirationDate) ??
      (isRecord(raw.active) ? asString(raw.active.to) : undefined) ??
      asString(raw.expiresAt),
    isAvailable: typeof raw.isAvailable === "boolean" ? raw.isAvailable : undefined,
    points: asNumber(raw.points),
    credits: asNumber(raw.credits),
    reward,
    stock: isRecord(raw.stock)
      ? {
          redeemed: asNumber(raw.stock.redeemed),
          available: asNumber(raw.stock.available),
          count: asNumber(raw.stock.count),
        }
      : undefined,
    location,
  };
};

const parseMissionsPayload = (payload: unknown): GameLayerMission[] => {
  if (Array.isArray(payload)) {
    return payload.map(normalizeMission).filter((mission): mission is GameLayerMission => mission !== null);
  }

  if (isRecord(payload) && Array.isArray(payload.missions)) {
    return payload.missions
      .map(normalizeMission)
      .filter((mission): mission is GameLayerMission => mission !== null);
  }

  return [];
};

const parseMissionPayload = (payload: unknown): GameLayerMission | null => {
  if (isRecord(payload) && isRecord(payload.mission)) {
    return normalizeMission(payload.mission);
  }
  return normalizeMission(payload);
};

const parsePrizesPayload = (payload: unknown): GameLayerPrize[] => {
  if (Array.isArray(payload)) {
    return payload.map(normalizePrize).filter((prize): prize is GameLayerPrize => prize !== null);
  }

  if (isRecord(payload) && Array.isArray(payload.prizes)) {
    return payload.prizes.map(normalizePrize).filter((prize): prize is GameLayerPrize => prize !== null);
  }

  return [];
};

const parsePrizePayload = (payload: unknown): GameLayerPrize | null => {
  if (isRecord(payload) && isRecord(payload.prize)) {
    return normalizePrize(payload.prize);
  }
  return normalizePrize(payload);
};

const toRadians = (value: number) => (value * Math.PI) / 180;
const distanceInMetres = (a: Coords, b: Coords) => {
  const earthRadius = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
};

const getCheckInEventId = (mission: GameLayerMission) => {
  const firstObjective = normalizeObjectives(mission.objectives).find((objective) => objective.event);
  return firstObjective?.event ?? "check-in";
};

const sortByPriority = (missions: GameLayerMission[]) =>
  [...missions].sort((a, b) => (a.priority ?? Number.MAX_SAFE_INTEGER) - (b.priority ?? Number.MAX_SAFE_INTEGER));

const missionIdentityKey = (mission: GameLayerMission) =>
  [
    (mission.name ?? "").trim().toLowerCase(),
    (mission.description ?? "").trim().toLowerCase(),
    (mission.category ?? "").trim().toLowerCase(),
    mission.location?.lat?.toFixed(6) ?? "",
    mission.location?.lon?.toFixed(6) ?? "",
    mission.reward?.points ?? mission.points ?? "",
    mission.reward?.credits ?? mission.credits ?? "",
    (mission.refreshPeriod ?? mission.period ?? "").trim().toLowerCase(),
    (mission.expiresAt ?? mission.active?.to ?? "").trim().toLowerCase(),
  ].join("|");

const missionCompletenessScore = (mission: GameLayerMission) => {
  let score = 0;
  if (mission.description) score += 1;
  if (mission.imgUrl) score += 1;
  if (mission.objectives) score += 1;
  if (mission.location?.lat !== undefined && mission.location?.lon !== undefined) score += 1;
  if (mission.active?.from || mission.active?.to || mission.expiresAt) score += 1;
  if ((mission.reward?.points ?? mission.points) !== undefined) score += 1;
  if ((mission.reward?.credits ?? mission.credits) !== undefined) score += 1;
  return score;
};

const dedupeMissions = (missions: GameLayerMission[]) => {
  const unique = new Map<string, GameLayerMission>();
  missions.forEach((mission) => {
    const key = missionIdentityKey(mission);
    const existing = unique.get(key);
    if (!existing) {
      unique.set(key, mission);
      return;
    }

    const existingScore = missionCompletenessScore(existing);
    const nextScore = missionCompletenessScore(mission);
    if (nextScore > existingScore) {
      unique.set(key, mission);
      return;
    }

    const existingPriority = existing.priority ?? Number.MAX_SAFE_INTEGER;
    const nextPriority = mission.priority ?? Number.MAX_SAFE_INTEGER;
    if (nextScore === existingScore && nextPriority < existingPriority) {
      unique.set(key, mission);
    }
  });
  return Array.from(unique.values());
};

const parseIsoDate = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatCountdown = (target: Date, now: Date) => {
  const totalSeconds = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${String(days).padStart(2, "0")}:${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const missionRefreshPeriod = (mission: GameLayerMission): "daily" | "weekly" | "monthly" | "all-time" | "unknown" => {
  const explicitPeriod = (mission.refreshPeriod ?? mission.period ?? "").toLowerCase();
  if (explicitPeriod.includes("daily")) return "daily";
  if (explicitPeriod.includes("weekly")) return "weekly";
  if (explicitPeriod.includes("monthly")) return "monthly";
  if (explicitPeriod.includes("all-time") || explicitPeriod.includes("alltime")) return "all-time";

  const tags = (mission.tags ?? []).map((tag) => tag.toLowerCase());
  if (tags.includes("daily")) return "daily";
  if (tags.includes("weekly")) return "weekly";
  if (tags.includes("monthly")) return "monthly";
  if (tags.includes("all-time") || tags.includes("alltime")) return "all-time";
  return "unknown";
};

const missionCountdown = (mission: GameLayerMission, now: Date) => {
  const period = missionRefreshPeriod(mission);

  if (period === "daily") {
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    return formatCountdown(nextMidnight, now);
  }

  if (period === "weekly") {
    const nextWeek = new Date(now);
    const day = nextWeek.getDay();
    const daysUntilNextMonday = ((8 - day) % 7) || 7;
    nextWeek.setDate(nextWeek.getDate() + daysUntilNextMonday);
    nextWeek.setHours(0, 0, 0, 0);
    return formatCountdown(nextWeek, now);
  }

  if (period === "monthly") {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    return formatCountdown(nextMonth, now);
  }

  const missionEnd = parseIsoDate(mission.active?.to ?? mission.expiresAt);
  if (missionEnd) {
    return formatCountdown(missionEnd, now);
  }

  return "--:--:--";
};

function AppIcon({
  name,
  label,
  fallback,
  className,
}: {
  name: IconName;
  label: string;
  fallback: string;
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);
  return (
    <span className={className ? `app-icon app-icon--${name} ${className}` : `app-icon app-icon--${name}`} aria-label={label}>
      {!hasError ? (
        <img
          src={ICON_PATHS[name]}
          alt=""
          aria-hidden="true"
          className="app-icon-image"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="app-icon-fallback">{fallback}</span>
      )}
    </span>
  );
}

function ChallengeSection({
  title,
  missions,
  loading,
  now,
}: {
  title: string;
  missions: GameLayerMission[];
  loading: boolean;
  now: Date;
}) {
  return (
    <section className="challenge-section">
      <header className="challenge-section-header">
        <div className="challenge-section-title">
          <AppIcon name="mission" label="Mission" fallback="◎" className="challenge-target-icon" />
          <h3>{title}</h3>
        </div>
      </header>

      {loading ? <p className="challenge-empty">Loading challenges...</p> : null}
      {!loading && missions.length === 0 ? <p className="challenge-empty">No missions available</p> : null}

      {!loading ? (
        <div className="challenge-list">
          {missions.map((mission) => {
            const xp = mission.reward?.points ?? mission.points ?? 0;
            const gems = mission.reward?.credits ?? mission.credits ?? 0;
            const countdown = missionCountdown(mission, now);
            return (
              <article className="challenge-card" key={mission.id}>
                <div className="challenge-card-image-wrap">
                  {mission.imgUrl ? (
                    <img src={mission.imgUrl} alt={mission.name ?? "Challenge"} className="challenge-card-image" />
                  ) : (
                    <div className="challenge-card-image challenge-card-fallback">🎯</div>
                  )}
                  {mission.category ? (
                    <div className="challenge-category-badge">{mission.category.toUpperCase()}</div>
                  ) : null}
                  <div className="challenge-card-badges">
                    <div className="challenge-badge xp">
                      <strong>{xp}</strong>
                      <span>
                        <AppIcon name="zap" label="XP" fallback="⚡" className="inline-badge-icon" /> XP
                      </span>
                    </div>
                    <div className="challenge-badge gems">
                      <strong>{gems}</strong>
                      <span>
                        <AppIcon name="gem" label="Gems" fallback="💎" className="inline-badge-icon" /> Gems
                      </span>
                    </div>
                  </div>
                </div>
                <div className="challenge-card-body">
                  <div className="challenge-card-header-row">
                    <p className="challenge-card-name">{mission.name ?? "Challenge"}</p>
                    <p className="challenge-card-timer">{countdown}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function TestChallengeSection({
  missions,
  now,
}: {
  missions: GameLayerMission[];
  now: Date;
}) {
  return (
    <section className="challenge-section">
      <header className="challenge-section-header">
        <div className="challenge-section-title">
          <AppIcon name="mission" label="Mission" fallback="🧪" className="challenge-target-icon" />
          <h3>Test Challenges</h3>
        </div>
      </header>

      {missions.length === 0 ? <p className="challenge-empty">No missions available</p> : null}

      <div className="test-challenge-list">
        {missions.map((mission) => {
          const timer = missionCountdown(mission, now);
          const gems = mission.reward?.credits ?? mission.credits ?? 0;
          const xp = mission.reward?.points ?? mission.points ?? 0;
          return (
            <article key={`test-${mission.id}`} className="test-challenge-card">
              {mission.imgUrl ? (
                <img src={mission.imgUrl} alt={mission.name ?? "Challenge"} className="test-challenge-thumb" />
              ) : (
                <div className="test-challenge-thumb test-fallback">🎯</div>
              )}

              <div className="test-challenge-main">
                <p className="test-challenge-title">{mission.name ?? "Challenge"}</p>
                <p className="test-challenge-time-pill">{timer}</p>
              </div>

              <div className="test-challenge-badges">
                <span className="test-mini-badge xp">
                  <AppIcon name="zap" label="XP" fallback="⚡" className="inline-badge-icon" />
                  {xp} XP
                </span>
                <span className="test-mini-badge gems">
                  <AppIcon name="gem" label="Gems" fallback="💎" className="inline-badge-icon" />
                  {gems > 0 ? `-${gems}` : gems} Gems
                </span>
              </div>

              <span className="test-challenge-chevron">›</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RewardsSection({
  availableRewards,
  redeemedRewards,
  loadingAvailable,
  loadingRedeemed,
  onClaim,
  now,
}: {
  availableRewards: GameLayerPrize[];
  redeemedRewards: GameLayerPrize[];
  loadingAvailable: boolean;
  loadingRedeemed: boolean;
  onClaim: (prize: GameLayerPrize, withLocation: boolean) => void;
  now: Date;
}) {
  const timeRemainingForPrize = (prize: GameLayerPrize) => {
    const period = (prize.period ?? "").toLowerCase();
    if (period === "daily") {
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      return formatCountdown(nextMidnight, now);
    }

    const expiry = parseIsoDate(prize.expirationDate);
    if (expiry) {
      return formatCountdown(expiry, now);
    }

    return "--:--:--";
  };

  const canClaim = (prize: GameLayerPrize, actionable = true) => {
    const isAvailable = prize.isAvailable ?? true;
    const stock = prize.stock?.available ?? 1;
    return actionable && isAvailable && stock > 0;
  };

  return (
    <>
      <section className="challenge-section">
        <header className="challenge-section-header">
          <div className="challenge-section-title">
            <AppIcon name="rewards" label="Rewards" fallback="🎁" className="challenge-target-icon" />
            <h3>Available Rewards</h3>
          </div>
        </header>

        {loadingAvailable ? <p className="challenge-empty">Loading rewards...</p> : null}
        {!loadingAvailable && availableRewards.length === 0 ? (
          <p className="challenge-empty">No rewards available</p>
        ) : null}

        {!loadingAvailable ? (
          <div className="challenge-list">
            {availableRewards.map((reward) => {
            const gems = reward.reward?.credits ?? reward.credits ?? 0;
              const stock = reward.stock?.available ?? 0;
              return (
                <article className="challenge-card" key={reward.id}>
                  <div className="challenge-card-image-wrap">
                    {reward.imgUrl ? (
                      <img src={reward.imgUrl} alt={reward.name ?? "Reward"} className="challenge-card-image" />
                    ) : (
                      <div className="challenge-card-image challenge-card-fallback">🎁</div>
                    )}
                    <div className="challenge-card-badges">
                      <div className="challenge-badge gems">
                        <strong>{gems > 0 ? `-${gems}` : gems}</strong>
                        <span>
                          <AppIcon name="gem" label="Gems" fallback="💎" className="inline-badge-icon" /> Gems
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="challenge-card-body">
                    <div className="challenge-card-header-row">
                      <p className="challenge-card-name">{reward.name ?? "Reward"}</p>
                      <p className="challenge-card-timer">{timeRemainingForPrize(reward)}</p>
                    </div>
                    <p className="reward-stock">{stock} available</p>
                    <button
                      type="button"
                      className="reward-cta"
                      onClick={() => onClaim(reward, false)}
                      disabled={!canClaim(reward, true)}
                    >
                      COLLECT
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

      <section className="challenge-section">
        <header className="challenge-section-header">
          <div className="challenge-section-title">
            <AppIcon name="rewards" label="Rewards" fallback="🧾" className="challenge-target-icon" />
            <h3>My Rewards</h3>
          </div>
        </header>
        {loadingRedeemed ? <p className="challenge-empty">Loading redeemed rewards...</p> : null}
        {!loadingRedeemed && redeemedRewards.length === 0 ? (
          <p className="challenge-empty">No prizes redeemed yet</p>
        ) : null}
        {!loadingRedeemed ? (
          <div className="challenge-list">
            {redeemedRewards.map((reward) => (
              <article className="challenge-card redeemed" key={`redeemed-${reward.id}`}>
                <div className="challenge-card-body">
                  <p className="challenge-card-name">{reward.name ?? "Reward"}</p>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}

function TestRewardsSection({
  rewards,
  now,
}: {
  rewards: GameLayerPrize[];
  now: Date;
}) {
  const timeRemainingForPrize = (prize: GameLayerPrize) => {
    const period = (prize.period ?? "").toLowerCase();
    if (period === "daily") {
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 0, 0);
      return formatCountdown(nextMidnight, now);
    }
    const expiry = parseIsoDate(prize.expirationDate);
    if (expiry) {
      return formatCountdown(expiry, now);
    }
    return "--:--:--";
  };

  return (
    <section className="challenge-section">
      <header className="challenge-section-header">
        <div className="challenge-section-title">
          <AppIcon name="rewards" label="Rewards" fallback="🧪" className="challenge-target-icon" />
          <h3>Test Rewards</h3>
        </div>
      </header>

      {rewards.length === 0 ? <p className="challenge-empty">No rewards available</p> : null}

      <div className="test-challenge-list">
        {rewards.map((reward) => {
          const timer = timeRemainingForPrize(reward);
          const gems = reward.reward?.credits ?? reward.credits ?? 0;
          const xp = reward.reward?.points ?? reward.points ?? 0;
          return (
            <article key={`test-reward-${reward.id}`} className="test-challenge-card">
              {reward.imgUrl ? (
                <img src={reward.imgUrl} alt={reward.name ?? "Reward"} className="test-challenge-thumb" />
              ) : (
                <div className="test-challenge-thumb test-fallback">🎁</div>
              )}

              <div className="test-challenge-main">
                <p className="test-challenge-title">{reward.name ?? "Reward"}</p>
                <p className="test-challenge-time-pill">{timer}</p>
              </div>

              <div className="test-challenge-badges">
                <span className="test-mini-badge xp">
                  <AppIcon name="zap" label="XP" fallback="⚡" className="inline-badge-icon" />
                  {xp} XP
                </span>
                <span className="test-mini-badge gems">
                  <AppIcon name="gem" label="Gems" fallback="💎" className="inline-badge-icon" />
                  {gems > 0 ? `-${gems}` : gems} Gems
                </span>
              </div>

              <span className="test-challenge-chevron">›</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default function App() {
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.CircleMarker | null>(null);
  const hasCenteredOnUserRef = useRef(false);
  const missionLayerRef = useRef<L.LayerGroup | null>(null);
  const mapMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const mapMarkerClassRef = useRef<Map<string, "actionable" | "viewable">>(new Map());
  const mapMarkerModeRef = useRef<"Challenges" | "Rewards" | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastLocationFetchRef = useRef<number>(0);
  const checkInCloseTimerRef = useRef<number | null>(null);
  const rewardCloseTimerRef = useRef<number | null>(null);
  const previousPageRef = useRef<"Home" | "Challenges" | "Rewards" | null>(null);
  const previousHomeMapModeRef = useRef<"Challenges" | "Rewards" | null>(null);
  const [currentPage, setCurrentPage] = useState<"Home" | "Challenges" | "Rewards">("Home");
  const [homeMapMode, setHomeMapMode] = useState<"Challenges" | "Rewards">("Challenges");
  const [player, setPlayer] = useState<GameLayerPlayer | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [userCoords, setUserCoords] = useState<Coords | null>(null);
  const [visibleBounds, setVisibleBounds] = useState<L.LatLngBounds | null>(null);
  const [missions, setMissions] = useState<GameLayerMission[]>([]);
  const [missionsError, setMissionsError] = useState<string | null>(null);
  const [isMissionsLoading, setIsMissionsLoading] = useState(false);
  const [rewards, setRewards] = useState<GameLayerPrize[]>([]);
  const [rewardsError, setRewardsError] = useState<string | null>(null);
  const [isRewardsLoading, setIsRewardsLoading] = useState(false);
  const [redeemedRewards, setRedeemedRewards] = useState<GameLayerPrize[]>([]);
  const [isRedeemedLoading, setIsRedeemedLoading] = useState(false);
  const [selectedMission, setSelectedMission] = useState<MissionAnnotation | null>(null);
  const [selectedMissionDetail, setSelectedMissionDetail] = useState<GameLayerMission | null>(null);
  const [selectedReward, setSelectedReward] = useState<PrizeAnnotation | null>(null);
  const [selectedRewardDetail, setSelectedRewardDetail] = useState<GameLayerPrize | null>(null);
  const [isMissionDetailLoading, setIsMissionDetailLoading] = useState(false);
  const [isRewardDetailLoading, setIsRewardDetailLoading] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState<string | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const [rewardError, setRewardError] = useState<string | null>(null);
  const [activeMapCategory, setActiveMapCategory] = useState<MarkerCategory>("all");
  const [visitedMissionIds, setVisitedMissionIds] = useState<Set<string>>(new Set());
  const [visitedRewardIds, setVisitedRewardIds] = useState<Set<string>>(new Set());
  const [currentTime, setCurrentTime] = useState(new Date());

  const apiKey = import.meta.env.VITE_CITY_QUEST_API_KEY as string | undefined;
  const accountName = import.meta.env.VITE_CITY_QUEST_ACCOUNT_ID as string | undefined;
  const playerId = import.meta.env.VITE_CITY_QUEST_PLAYER_ID as string | undefined;
  const stadiaMapsApiKey = import.meta.env.VITE_STADIA_MAPS_API_KEY as string | undefined;
  const hasCredentials = Boolean(apiKey && accountName && playerId);

  const buildUrl = useCallback(
    (path: string, query?: Record<string, string | number | undefined>) => {
      if (!accountName) {
        throw new Error("Missing account name");
      }
      const url = new URL(`${GAME_LAYER_BASE_URL}/${path}`);
      url.searchParams.set("account", accountName);
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          if (value !== undefined) {
            url.searchParams.set(key, String(value));
          }
        });
      }
      return url;
    },
    [accountName]
  );

  const fetchJson = useCallback(
    async <T,>(url: URL, init?: RequestInit): Promise<T> => {
      if (!apiKey) {
        throw new Error("Missing API key");
      }

      const response = await fetch(url, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "api-key": apiKey,
          ...(init?.headers ?? {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
      }

      return (await response.json()) as T;
    },
    [apiKey]
  );

  const mergeMissions = (incoming: GameLayerMission[]) => {
    setMissions((current) => {
      return dedupeMissions([...current, ...incoming]);
    });
  };
  const mergeRewards = (incoming: GameLayerPrize[]) => {
    setRewards((current) => {
      const merged = new Map<string, GameLayerPrize>(current.map((reward) => [reward.id, reward]));
      incoming.forEach((reward) => merged.set(reward.id, reward));
      return Array.from(merged.values());
    });
  };

  const closeMissionModal = useCallback(() => {
    setSelectedMission(null);
    setSelectedMissionDetail(null);
    setCheckInError(null);
    setCheckInMessage(null);
    if (checkInCloseTimerRef.current !== null) {
      window.clearTimeout(checkInCloseTimerRef.current);
      checkInCloseTimerRef.current = null;
    }
  }, []);

  const closeRewardModal = useCallback(() => {
    setSelectedReward(null);
    setSelectedRewardDetail(null);
    setRewardError(null);
    setRewardMessage(null);
    if (rewardCloseTimerRef.current !== null) {
      window.clearTimeout(rewardCloseTimerRef.current);
      rewardCloseTimerRef.current = null;
    }
  }, []);

  const refreshProfileData = useCallback(async (silent = false) => {
    if (!hasCredentials) return;

    if (!silent) {
      setIsProfileLoading(true);
      setProfileError(null);
    }
    try {
      const playerData = await fetchJson<GameLayerPlayer>(
        buildUrl(`players/${encodeURIComponent(playerId ?? "")}`)
      );
      setPlayer(playerData);
      setProfileError(null);

      if (playerData.team) {
        try {
          const teamData = await fetchJson<GameLayerTeamResponse | GameLayerTeam>(
            buildUrl(`teams/${encodeURIComponent(playerData.team)}`)
          );
          const nestedTeam = (teamData as GameLayerTeamResponse).team;
          if (nestedTeam) {
            setTeamName(nestedTeam.name ?? playerData.team ?? null);
          } else {
            setTeamName((teamData as GameLayerTeam).name ?? playerData.team ?? null);
          }
        } catch {
          setTeamName(playerData.team ?? null);
        }
      } else {
        setTeamName(null);
      }
    } catch (error) {
      if (!silent) {
        setProfileError(error instanceof Error ? error.message : "Failed to load player profile.");
        setPlayer(null);
        setTeamName(null);
      }
    } finally {
      if (!silent) {
        setIsProfileLoading(false);
      }
    }
  }, [buildUrl, fetchJson, hasCredentials, playerId]);

  const refreshMissionsData = useCallback(
    async (coords?: Coords, silent = false) => {
      if (!hasCredentials) return;
      if (!silent) setIsMissionsLoading(true);
      setMissionsError(null);
      try {
        const query: Record<string, string | number | undefined> = { player: playerId ?? "" };
        if (coords) {
          query.lat = coords.latitude;
          query.lon = coords.longitude;
        }
        const payload = await fetchJson<unknown>(buildUrl("missions", query));
        mergeMissions(parseMissionsPayload(payload));
      } catch (error) {
        setMissionsError(error instanceof Error ? error.message : "Failed to load missions.");
      } finally {
        if (!silent) {
          setIsMissionsLoading(false);
        }
      }
    },
    [buildUrl, fetchJson, hasCredentials, playerId]
  );
  const refreshRewardsData = useCallback(
    async (coords?: Coords, silent = false) => {
      if (!hasCredentials) return;
      if (!silent) setIsRewardsLoading(true);
      setRewardsError(null);
      try {
        const query: Record<string, string | number | undefined> = { player: playerId ?? "" };
        if (coords) {
          query.lat = coords.latitude;
          query.lon = coords.longitude;
        }
        const payload = await fetchJson<unknown>(buildUrl("prizes", query));
        mergeRewards(parsePrizesPayload(payload));
      } catch (error) {
        setRewardsError(error instanceof Error ? error.message : "Failed to load rewards.");
      } finally {
        if (!silent) {
          setIsRewardsLoading(false);
        }
      }
    },
    [buildUrl, fetchJson, hasCredentials, playerId]
  );
  const refreshRedeemedRewards = useCallback(async () => {
    if (!hasCredentials) return;
    setIsRedeemedLoading(true);
    try {
      const payload = await fetchJson<unknown>(
        buildUrl(`players/${encodeURIComponent(playerId ?? "")}/prizes`)
      );
      if (Array.isArray(payload)) {
        setRedeemedRewards(parsePrizesPayload(payload));
      } else if (isRecord(payload) && Array.isArray(payload.prizes)) {
        setRedeemedRewards(parsePrizesPayload(payload.prizes));
      } else {
        setRedeemedRewards([]);
      }
    } catch {
      setRedeemedRewards([]);
    } finally {
      setIsRedeemedLoading(false);
    }
  }, [buildUrl, fetchJson, hasCredentials, playerId]);

  useEffect(() => {
    if (!mapNodeRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapNodeRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude], 15);

    const tileUrl = stadiaMapsApiKey
      ? `${STADIA_TILE_URL}?api_key=${encodeURIComponent(stadiaMapsApiKey)}`
      : CARTO_DARK_TILE_URL;
    L.tileLayer(tileUrl, TILE_LAYER_OPTIONS).addTo(map);

    missionLayerRef.current = L.layerGroup().addTo(map);
    map.on("moveend", () => {
      setVisibleBounds(map.getBounds());
    });
    setVisibleBounds(map.getBounds());

    mapRef.current = map;

    return () => {
      map.off("moveend");
      map.remove();
      mapRef.current = null;
      missionLayerRef.current = null;
    };
  }, [stadiaMapsApiKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userCoords || hasCenteredOnUserRef.current) {
      return;
    }

    const target: [number, number] = [userCoords.latitude, userCoords.longitude];
    map.setView(target, Math.max(map.getZoom(), 16), { animate: false });
    hasCenteredOnUserRef.current = true;

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(target);
    } else {
      userMarkerRef.current = L.circleMarker(target, {
        radius: 10,
        color: "#ffffff",
        weight: 3,
        fillColor: "#2aa4ff",
        fillOpacity: 1,
      }).addTo(map);
    }
  }, [userCoords]);

  useEffect(() => {
    if (!window.isSecureContext || !("geolocation" in navigator)) {
      return;
    }

    const updatePosition = (coords: Coords) => {
      const map = mapRef.current;
      if (!map) {
        return;
      }

      const target: [number, number] = [coords.latitude, coords.longitude];
      setUserCoords(coords);
      if (!hasCenteredOnUserRef.current) {
        map.setView(target, Math.max(map.getZoom(), 16), { animate: false });
        hasCenteredOnUserRef.current = true;
      }

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(target);
      } else {
        userMarkerRef.current = L.circleMarker(target, {
          radius: 10,
          color: "#ffffff",
          weight: 3,
          fillColor: "#2aa4ff",
          fillOpacity: 1,
        }).addTo(map);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (position) =>
        updatePosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => {
        const map = mapRef.current;
        if (!map || userMarkerRef.current) {
          return;
        }
        const fallback: [number, number] = [DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude];
        userMarkerRef.current = L.circleMarker(fallback, {
          radius: 10,
          color: "#ffffff",
          weight: 3,
          fillColor: "#2aa4ff",
          fillOpacity: 1,
        }).addTo(map);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) =>
        updatePosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      () => {},
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 15000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  const locationAnnotations = useMemo(() => {
    return missions
      .map((mission) => {
        const lat = mission.location?.lat;
        const lon = mission.location?.lon;
        if (lat === undefined || lon === undefined) return null;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

        const target: Coords = { latitude: lat, longitude: lon };
        const distanceMetres = userCoords ? distanceInMetres(userCoords, target) : Number.POSITIVE_INFINITY;
        const withinViewable =
          (mission.location?.viewableDistance ?? 0) > 0 &&
          distanceMetres <= (mission.location?.viewableDistance ?? 0);
        const inVisibleMap = visibleBounds
          ? visibleBounds.contains(L.latLng(lat, lon))
          : false;

        if (!withinViewable && !inVisibleMap) return null;

        const isActionable =
          (mission.location?.actionableDistance ?? 0) > 0 &&
          distanceMetres <= (mission.location?.actionableDistance ?? 0);
        const category = resolveMarkerCategory(mission.category, mission.tags);

        return { mission, lat, lon, distanceMetres, isActionable, category };
      })
      .filter((entry): entry is MissionAnnotation => entry !== null);
  }, [missions, userCoords, visibleBounds]);
  const rewardAnnotations = useMemo(() => {
    return rewards
      .map((reward) => {
        const lat = reward.location?.lat;
        const lon = reward.location?.lon;
        if (lat === undefined || lon === undefined) return null;
        if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;

        const target: Coords = { latitude: lat, longitude: lon };
        const distanceMetres = userCoords ? distanceInMetres(userCoords, target) : Number.POSITIVE_INFINITY;
        const withinViewable =
          (reward.location?.viewableDistance ?? 0) > 0 &&
          distanceMetres <= (reward.location?.viewableDistance ?? 0);
        const inVisibleMap = visibleBounds ? visibleBounds.contains(L.latLng(lat, lon)) : false;

        if (!withinViewable && !inVisibleMap) return null;

        const isActionable =
          (reward.location?.actionableDistance ?? 0) > 0 &&
          distanceMetres <= (reward.location?.actionableDistance ?? 0);
        const category = resolveMarkerCategory(undefined, reward.tags);

        return { prize: reward, lat, lon, distanceMetres, isActionable, category };
      })
      .filter((entry): entry is PrizeAnnotation => entry !== null);
  }, [rewards, userCoords, visibleBounds]);

  const filteredLocationAnnotations = useMemo(() => {
    if (activeMapCategory === "all") return locationAnnotations;
    return locationAnnotations.filter((annotation) => annotation.category === activeMapCategory);
  }, [activeMapCategory, locationAnnotations]);

  const filteredRewardAnnotations = useMemo(() => {
    if (activeMapCategory === "all") return rewardAnnotations;
    return rewardAnnotations.filter((annotation) => annotation.category === activeMapCategory);
  }, [activeMapCategory, rewardAnnotations]);

  useEffect(() => {
    const map = mapRef.current;
    const missionLayer = missionLayerRef.current;
    if (!map || !missionLayer) return;
    const clearAllMarkers = () => {
      mapMarkersRef.current.forEach((marker) => {
        missionLayer.removeLayer(marker);
      });
      mapMarkersRef.current.clear();
      mapMarkerClassRef.current.clear();
    };

    if (currentPage !== "Home") {
      clearAllMarkers();
      mapMarkerModeRef.current = null;
      return;
    }

    if (mapMarkerModeRef.current !== homeMapMode) {
      clearAllMarkers();
      mapMarkerModeRef.current = homeMapMode;
    }

    if (homeMapMode === "Challenges") {
      const visibleIds = new Set<string>();
      filteredLocationAnnotations.forEach((annotation) => {
        const markerId = annotation.mission.id;
        const markerClass: "actionable" | "viewable" = annotation.isActionable ? "actionable" : "viewable";
        const markerColor = categoryColorMap[annotation.category];
        const visited = visitedMissionIds.has(annotation.mission.id);
        const markerHtml = `<div class="mission-pin ${markerClass}${visited ? " visited" : ""}" style="--marker-color:${markerColor};"><span class="mission-pin-outer"></span><span class="mission-pin-inner"></span><span class="mission-pin-core">${visited ? "✓" : ""}</span></div>`;
        visibleIds.add(markerId);

        const existing = mapMarkersRef.current.get(markerId);
        if (!existing) {
          const marker = L.marker([annotation.lat, annotation.lon], {
            icon: L.divIcon({
              className: "mission-pin-wrapper",
              html: markerHtml,
              iconSize: [54, 54],
              iconAnchor: [27, 27],
            }),
          });
          marker.on("click", () => {
            setSelectedMission(annotation);
            setSelectedMissionDetail(annotation.mission);
            setCheckInError(null);
            setCheckInMessage(null);
          });
          marker.addTo(missionLayer);
          mapMarkersRef.current.set(markerId, marker);
          mapMarkerClassRef.current.set(markerId, markerClass);
          return;
        }

        existing.setLatLng([annotation.lat, annotation.lon]);
        if (mapMarkerClassRef.current.get(markerId) !== markerClass) {
          existing.setIcon(
            L.divIcon({
              className: "mission-pin-wrapper",
              html: markerHtml,
              iconSize: [54, 54],
              iconAnchor: [27, 27],
            })
          );
          mapMarkerClassRef.current.set(markerId, markerClass);
        } else {
          existing.setIcon(
            L.divIcon({
              className: "mission-pin-wrapper",
              html: markerHtml,
              iconSize: [54, 54],
              iconAnchor: [27, 27],
            })
          );
        }
      });

      mapMarkersRef.current.forEach((marker, markerId) => {
        if (!visibleIds.has(markerId)) {
          missionLayer.removeLayer(marker);
          mapMarkersRef.current.delete(markerId);
          mapMarkerClassRef.current.delete(markerId);
        }
      });
      return;
    }

    const visibleIds = new Set<string>();
    filteredRewardAnnotations.forEach((annotation) => {
      const markerId = annotation.prize.id;
      const markerClass: "actionable" | "viewable" = annotation.isActionable ? "actionable" : "viewable";
      const markerColor = categoryColorMap[annotation.category];
      const visited = visitedRewardIds.has(annotation.prize.id);
      const markerHtml = `<div class="mission-pin ${markerClass}${visited ? " visited" : ""}" style="--marker-color:${markerColor};"><span class="mission-pin-outer"></span><span class="mission-pin-inner"></span><span class="mission-pin-core">${visited ? "✓" : ""}</span></div>`;
      visibleIds.add(markerId);

      const existing = mapMarkersRef.current.get(markerId);
      if (!existing) {
        const marker = L.marker([annotation.lat, annotation.lon], {
          icon: L.divIcon({
            className: "mission-pin-wrapper",
            html: markerHtml,
            iconSize: [54, 54],
            iconAnchor: [27, 27],
          }),
        });
        marker.on("click", () => {
          setSelectedReward(annotation);
          setSelectedRewardDetail(annotation.prize);
          setRewardError(null);
          setRewardMessage(null);
        });
        marker.addTo(missionLayer);
        mapMarkersRef.current.set(markerId, marker);
        mapMarkerClassRef.current.set(markerId, markerClass);
        return;
      }

      existing.setLatLng([annotation.lat, annotation.lon]);
      if (mapMarkerClassRef.current.get(markerId) !== markerClass) {
        existing.setIcon(
          L.divIcon({
            className: "mission-pin-wrapper",
            html: markerHtml,
            iconSize: [54, 54],
            iconAnchor: [27, 27],
          })
        );
        mapMarkerClassRef.current.set(markerId, markerClass);
      } else {
        existing.setIcon(
          L.divIcon({
            className: "mission-pin-wrapper",
            html: markerHtml,
            iconSize: [54, 54],
            iconAnchor: [27, 27],
          })
        );
      }
    });

    mapMarkersRef.current.forEach((marker, markerId) => {
      if (!visibleIds.has(markerId)) {
        missionLayer.removeLayer(marker);
        mapMarkersRef.current.delete(markerId);
        mapMarkerClassRef.current.delete(markerId);
      }
    });
  }, [
    currentPage,
    filteredLocationAnnotations,
    filteredRewardAnnotations,
    homeMapMode,
    visitedMissionIds,
    visitedRewardIds,
  ]);

  useEffect(() => {
    if (!hasCredentials) {
      setProfileError("Missing API credentials in .env.local.");
      setMissionsError("Missing API credentials in .env.local.");
      return;
    }

    void refreshProfileData();
  }, [hasCredentials, refreshProfileData]);

  useEffect(() => {
    if (!hasCredentials) return;
    if (previousPageRef.current === null) {
      previousPageRef.current = currentPage;
      return;
    }
    if (previousPageRef.current === currentPage) return;
    previousPageRef.current = currentPage;
    void refreshProfileData(true);
  }, [currentPage, hasCredentials, refreshProfileData]);

  useEffect(() => {
    if (!hasCredentials || currentPage !== "Home") return;
    if (previousHomeMapModeRef.current === null) {
      previousHomeMapModeRef.current = homeMapMode;
      return;
    }
    if (previousHomeMapModeRef.current === homeMapMode) return;
    previousHomeMapModeRef.current = homeMapMode;
    void refreshProfileData(true);
  }, [currentPage, hasCredentials, homeMapMode, refreshProfileData]);

  useEffect(() => {
    if (!hasCredentials) {
      return;
    }

    if (!userCoords) {
      void refreshMissionsData(undefined, false);
      void refreshRewardsData(undefined, false);
      return;
    }

    const timer = window.setTimeout(() => {
      void refreshMissionsData(userCoords, true);
      void refreshRewardsData(userCoords, true);
    }, 700);

    return () => {
      window.clearTimeout(timer);
    };
  }, [hasCredentials, refreshMissionsData, refreshRewardsData, userCoords]);

  useEffect(() => {
    if (!hasCredentials) return;
    void refreshRedeemedRewards();
  }, [hasCredentials, refreshRedeemedRewards]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (checkInCloseTimerRef.current !== null) {
        window.clearTimeout(checkInCloseTimerRef.current);
      }
      if (rewardCloseTimerRef.current !== null) {
        window.clearTimeout(rewardCloseTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!hasCredentials || !selectedMission) {
      return;
    }

    let cancelled = false;

    const loadMissionDetail = async () => {
      setIsMissionDetailLoading(true);
      try {
        const payload = await fetchJson<unknown>(
          buildUrl(`missions/${encodeURIComponent(selectedMission.mission.id)}`, {
            player: playerId ?? "",
          })
        );
        if (cancelled) return;
        const mission = parseMissionPayload(payload);
        if (mission) {
          setSelectedMissionDetail(mission);
          mergeMissions([mission]);
        }
      } finally {
        if (!cancelled) setIsMissionDetailLoading(false);
      }
    };

    void loadMissionDetail();

    return () => {
      cancelled = true;
    };
  }, [accountName, apiKey, hasCredentials, playerId, selectedMission]);

  useEffect(() => {
    if (!hasCredentials || !selectedReward) {
      return;
    }

    let cancelled = false;
    const loadRewardDetail = async () => {
      setIsRewardDetailLoading(true);
      try {
        const payload = await fetchJson<unknown>(
          buildUrl(`prizes/${encodeURIComponent(selectedReward.prize.id)}`, {
            player: playerId ?? "",
          })
        );
        if (cancelled) return;
        const prize = parsePrizePayload(payload);
        if (prize) {
          setSelectedRewardDetail(prize);
          mergeRewards([prize]);
        }
      } finally {
        if (!cancelled) setIsRewardDetailLoading(false);
      }
    };

    void loadRewardDetail();

    return () => {
      cancelled = true;
    };
  }, [buildUrl, fetchJson, hasCredentials, playerId, selectedReward]);

  const selectedMissionActionable = useMemo(() => {
    const missionLoc = selectedMissionDetail?.location ?? selectedMission?.mission.location;
    if (!missionLoc || !userCoords || missionLoc.lat === undefined || missionLoc.lon === undefined) {
      return false;
    }
    const actionableDistance = missionLoc.actionableDistance ?? 0;
    if (actionableDistance <= 0) return false;
    return (
      distanceInMetres(userCoords, { latitude: missionLoc.lat, longitude: missionLoc.lon }) <=
      actionableDistance
    );
  }, [selectedMission, selectedMissionDetail, userCoords]);

  const selectedRewardActionable = useMemo(() => {
    const rewardLoc = selectedRewardDetail?.location ?? selectedReward?.prize.location;
    if (!rewardLoc || !userCoords || rewardLoc.lat === undefined || rewardLoc.lon === undefined) {
      return false;
    }
    const actionableDistance = rewardLoc.actionableDistance ?? 0;
    if (actionableDistance <= 0) return false;
    return (
      distanceInMetres(userCoords, { latitude: rewardLoc.lat, longitude: rewardLoc.lon }) <=
      actionableDistance
    );
  }, [selectedReward, selectedRewardDetail, userCoords]);

  const missionPoints =
    selectedMissionDetail?.reward?.points ?? selectedMissionDetail?.points ?? 0;
  const missionGems =
    selectedMissionDetail?.reward?.credits ?? selectedMissionDetail?.credits ?? 0;
  const missionEventId = selectedMissionDetail ? getCheckInEventId(selectedMissionDetail) : "check-in";

  const performCheckIn = async () => {
    if (!hasCredentials || !selectedMissionDetail) return;

    setIsCheckingIn(true);
    setCheckInError(null);
    setCheckInMessage(null);

    const url = new URL(`${GAME_LAYER_BASE_URL}/events/${encodeURIComponent(missionEventId)}/complete`);
    const requestBody: Record<string, string | number> = {
      player: playerId!,
      account: accountName!,
      count: 1,
    };
    if (userCoords) {
      requestBody.lat = userCoords.latitude;
      requestBody.lon = userCoords.longitude;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "api-key": apiKey!,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Check-in failed (${response.status})`);
      }

      setCheckInMessage("Check-in completed.");
      setVisitedMissionIds((current) => {
        const next = new Set(current);
        next.add(selectedMissionDetail.id);
        return next;
      });
      await refreshProfileData(true);

      const now = Date.now();
      if (now - lastLocationFetchRef.current > 1500 && userCoords) {
        lastLocationFetchRef.current = now;
        await refreshMissionsData(userCoords, true);
      }

      checkInCloseTimerRef.current = window.setTimeout(() => {
        closeMissionModal();
      }, 1200);
    } catch (error) {
      setCheckInError(error instanceof Error ? error.message : "Check-in failed.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const performRewardClaim = async () => {
    if (!selectedRewardDetail) return;
    setIsClaimingReward(true);
    setRewardError(null);
    setRewardMessage(null);
    const success = await claimReward(selectedRewardDetail, true);
    if (success) {
      setVisitedRewardIds((current) => {
        const next = new Set(current);
        next.add(selectedRewardDetail.id);
        return next;
      });
      setRewardMessage("Reward collected.");
      rewardCloseTimerRef.current = window.setTimeout(() => {
        closeRewardModal();
      }, 1200);
    } else {
      setRewardError("Unable to collect reward.");
    }
    setIsClaimingReward(false);
  };

  const displayName = player?.name || player?.player || "Player";
  const displayImage = player?.imgUrl;
  const displayPoints = player?.points ?? 0;
  const displayGems = player?.credits ?? 0;
  const displayLevel = player?.level?.ordinal ?? 0;
  const displayTeamName = teamName ?? "No Team";
  const collectedCardsCount = redeemedRewards.length;

  const eligibleChallenges = useMemo(
    () =>
      missions.filter((mission) => {
        const category = mission.category?.toUpperCase() ?? "";
        return category !== "ADVENT";
      }),
    [missions]
  );

  const myChallenges = useMemo(
    () => sortByPriority(dedupeMissions(eligibleChallenges)),
    [eligibleChallenges]
  );
  const availableRewards = useMemo(() => rewards, [rewards]);

  const claimReward = useCallback(
    async (reward: GameLayerPrize, withLocation: boolean): Promise<boolean> => {
      if (!hasCredentials) return false;
      setRewardsError(null);
      try {
        const url = new URL(`${GAME_LAYER_BASE_URL}/prizes/${encodeURIComponent(reward.id)}/claim`);
        const body: Record<string, string | number> = {
          player: playerId ?? "",
          account: accountName ?? "",
        };
        if (withLocation && userCoords) {
          body.lat = userCoords.latitude;
          body.lon = userCoords.longitude;
        }
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "api-key": apiKey ?? "",
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          throw new Error(`Claim failed (${response.status})`);
        }
        await Promise.all([
          refreshProfileData(true),
          refreshRewardsData(userCoords ?? undefined, true),
          refreshRedeemedRewards(),
        ]);
        return true;
      } catch (error) {
        setRewardsError(error instanceof Error ? error.message : "Failed to claim reward.");
        return false;
      }
    },
    [
      accountName,
      apiKey,
      hasCredentials,
      playerId,
      refreshProfileData,
      refreshRedeemedRewards,
      refreshRewardsData,
      userCoords,
    ]
  );

  return (
    <main className="app-shell">
      <div className="map-bg" ref={mapNodeRef} />
      {currentPage !== "Home" ? <div className="challenge-bg" /> : null}
      <div className="overlay">
        <header className="profile-card">
          <div className="profile-card-top">
            <div className="avatar-wrap">
              <div className="avatar">
                {displayImage ? (
                  <img src={displayImage} alt={displayName} className="avatar-image" />
                ) : (
                  "🧔"
                )}
              </div>
              <div className="collection-badge">{collectedCardsCount}</div>
              <div className="level-badge">{displayLevel}</div>
            </div>
            <div className="profile-main">
              <div className="name">{displayName}</div>
              <div className="squad">{displayTeamName}</div>
              {isProfileLoading ? <div className="profile-hint">Loading profile...</div> : null}
              {profileError ? <div className="profile-error">{profileError}</div> : null}
            </div>
            <div className="stats">
              <div className="stat-badge xp">
                <span className="stat-value">{displayPoints}</span>
                <span className="stat-meta">
                  <AppIcon name="zap" label="XP" fallback="⚡" className="inline-badge-icon" /> XP
                </span>
              </div>
              <div className="stat-badge gems">
                <span className="stat-value">{displayGems}</span>
                <span className="stat-meta">
                  <AppIcon name="gem" label="Gems" fallback="💎" className="inline-badge-icon" /> Gems
                </span>
              </div>
            </div>
          </div>
          <p className="powered-by">Powered by GameLayer</p>
        </header>
        {currentPage === "Home" ? (
          <div className="category-chip-row">
            {markerFilterChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                className={activeMapCategory === chip.id ? `category-chip active ${chip.id}` : "category-chip"}
                onClick={() => setActiveMapCategory(chip.id)}
              >
                <span>{chip.icon}</span> {chip.label}
              </button>
            ))}
          </div>
        ) : null}
        <div
          className={
            currentPage === "Home" ? "page-content page-content--passthrough" : "page-content"
          }
        >
          {currentPage === "Home" ? (
            <div className="segmented">
              <button
                type="button"
                className={homeMapMode === "Challenges" ? "segment active" : "segment"}
                onClick={() => setHomeMapMode("Challenges")}
              >
                Challenges
              </button>
              <button
                type="button"
                className={homeMapMode === "Rewards" ? "segment active" : "segment"}
                onClick={() => setHomeMapMode("Rewards")}
              >
                Rewards
              </button>
            </div>
          ) : null}

          {currentPage === "Challenges" ? (
            <section className="challenges-page">
              <ChallengeSection
                title="My Challenges"
                missions={myChallenges}
                loading={isMissionsLoading}
                now={currentTime}
              />
              <TestChallengeSection missions={myChallenges} now={currentTime} />
              {missionsError ? <p className="challenges-error">{missionsError}</p> : null}
            </section>
          ) : null}
          {currentPage === "Rewards" ? (
            <section className="challenges-page">
              <RewardsSection
                availableRewards={availableRewards}
                redeemedRewards={redeemedRewards}
                loadingAvailable={isRewardsLoading}
                loadingRedeemed={isRedeemedLoading}
                onClaim={(reward, withLocation) => {
                  void claimReward(reward, withLocation);
                }}
                now={currentTime}
              />
              <TestRewardsSection rewards={availableRewards} now={currentTime} />
              {rewardsError ? <p className="challenges-error">{rewardsError}</p> : null}
            </section>
          ) : null}
        </div>
        <nav className="bottom-ribbon">
          <button
            type="button"
            className={currentPage === "Home" ? "ribbon-tab active" : "ribbon-tab"}
            onClick={() => setCurrentPage("Home")}
          >
            <AppIcon name="home" label="Home" fallback="🏠" className="ribbon-icon" />
            <small>Home</small>
          </button>
          <button
            type="button"
            className={currentPage === "Challenges" ? "ribbon-tab active" : "ribbon-tab"}
            onClick={() => setCurrentPage("Challenges")}
          >
            <AppIcon name="mission" label="Challenges" fallback="🏆" className="ribbon-icon" />
            <small>Challenges</small>
          </button>
          <button
            type="button"
            className={currentPage === "Rewards" ? "ribbon-tab active" : "ribbon-tab"}
            onClick={() => setCurrentPage("Rewards")}
          >
            <AppIcon name="rewards" label="Rewards" fallback="🎁" className="ribbon-icon" />
            <small>Rewards</small>
          </button>
        </nav>
      </div>

      {selectedMission ? (
        <div className="mission-modal-backdrop" onClick={closeMissionModal}>
          <section className="mission-modal" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-grab-handle" />
            <button type="button" className="mission-modal-close" onClick={closeMissionModal}>
              ✕
            </button>
            {selectedMissionDetail?.imgUrl ? (
              <div className="mission-modal-image-wrap">
                <img
                  className="mission-modal-image"
                  src={selectedMissionDetail.imgUrl}
                  alt={selectedMissionDetail.name ?? "Mission"}
                />
                <div className="mission-modal-image-badges">
                  <div className="mission-mini-badge xp">
                    <strong>{missionPoints}</strong>
                    <span>
                      <AppIcon name="zap" label="XP" fallback="⚡" className="inline-badge-icon" /> XP
                    </span>
                  </div>
                  <div className="mission-mini-badge gems">
                    <strong>{missionGems}</strong>
                    <span>
                      <AppIcon name="gem" label="Gems" fallback="💎" className="inline-badge-icon" /> Gems
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mission-modal-image-wrap">
                <div className="mission-modal-image mission-modal-fallback">🎯</div>
                <div className="mission-modal-image-badges">
                  <div className="mission-mini-badge xp">
                    <strong>{missionPoints}</strong>
                    <span>
                      <AppIcon name="zap" label="XP" fallback="⚡" className="inline-badge-icon" /> XP
                    </span>
                  </div>
                  <div className="mission-mini-badge gems">
                    <strong>{missionGems}</strong>
                    <span>
                      <AppIcon name="gem" label="Gems" fallback="💎" className="inline-badge-icon" /> Gems
                    </span>
                  </div>
                </div>
              </div>
            )}

            <h3>{selectedMissionDetail?.name ?? selectedMission.mission.name ?? "Location Challenge"}</h3>
            <p className="mission-modal-description">
              {selectedMissionDetail?.description ?? "Complete this mission by checking in at location."}
            </p>

            <p className={selectedMissionActionable ? "mission-range-pill in-range" : "mission-range-pill get-closer"}>
              {selectedMissionActionable ? "In Range" : "Get Closer"}
            </p>
            {!selectedMissionActionable ? (
              <p className="mission-modal-warning">Get within the actionable zone to check in.</p>
            ) : null}
            {isMissionDetailLoading ? <p className="mission-modal-loading">Loading mission detail...</p> : null}
            {checkInMessage ? <p className="mission-modal-success">{checkInMessage}</p> : null}
            {checkInError ? <p className="mission-modal-error">{checkInError}</p> : null}

            <button
              type="button"
              className={selectedMissionActionable ? "mission-checkin-btn actionable" : "mission-checkin-btn"}
              disabled={!selectedMissionActionable || isCheckingIn}
              onClick={() => {
                void performCheckIn();
              }}
            >
              {isCheckingIn ? "Checking in..." : "CHECK-IN"}
            </button>
          </section>
        </div>
      ) : null}

      {selectedReward ? (
        <div className="mission-modal-backdrop" onClick={closeRewardModal}>
          <section className="mission-modal" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-grab-handle" />
            <button type="button" className="mission-modal-close" onClick={closeRewardModal}>
              ✕
            </button>
            {selectedRewardDetail?.imgUrl ? (
              <div className="mission-modal-image-wrap">
                <img
                  className="mission-modal-image"
                  src={selectedRewardDetail.imgUrl}
                  alt={selectedRewardDetail.name ?? "Reward"}
                />
                <div className="mission-modal-image-badges">
                  <div className="mission-mini-badge gems">
                    <strong>
                      {(() => {
                        const gemCost =
                          selectedRewardDetail.reward?.credits ?? selectedRewardDetail.credits ?? 0;
                        return gemCost > 0 ? `-${gemCost}` : gemCost;
                      })()}
                    </strong>
                    <span>
                      <AppIcon name="gem" label="Gems" fallback="💎" className="inline-badge-icon" /> Gems
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mission-modal-image mission-modal-fallback">🎁</div>
            )}

            <h3>{selectedRewardDetail?.name ?? selectedReward.prize.name ?? "Location Reward"}</h3>
            <p className="mission-modal-description">
              {selectedRewardDetail?.description ?? "Collect this reward while in the actionable zone."}
            </p>
            <p className={selectedRewardActionable ? "mission-range-pill in-range" : "mission-range-pill get-closer"}>
              {selectedRewardActionable ? "In Range" : "Get Closer"}
            </p>
            {isRewardDetailLoading ? <p className="mission-modal-loading">Loading reward detail...</p> : null}
            {rewardMessage ? <p className="mission-modal-success">{rewardMessage}</p> : null}
            {rewardError ? <p className="mission-modal-error">{rewardError}</p> : null}

            <button
              type="button"
              className={selectedRewardActionable ? "reward-cta actionable" : "reward-cta"}
              disabled={!selectedRewardActionable || isClaimingReward}
              onClick={() => {
                void performRewardClaim();
              }}
            >
              {isClaimingReward ? "Collecting..." : "COLLECT"}
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
