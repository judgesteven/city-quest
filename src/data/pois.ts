export type Category = "food" | "history" | "art" | "nature" | "shopping" | "hidden";

export type POI = {
  id: string;
  name: string;
  category: Category;
  lat: number;
  lng: number;
  description: string;
  xpReward: number;
  gemReward: number;
  completed: boolean;
};

export const categories: Array<Category | "all"> = [
  "all",
  "food",
  "history",
  "art",
  "nature",
  "shopping",
  "hidden",
];

export const mockPois: POI[] = [
  {
    id: "poi-1",
    name: "Old Market Hall",
    category: "food",
    lat: 60.1677,
    lng: 24.952,
    description: "Taste local salmon soup and discover Helsinki's oldest food hall.",
    xpReward: 220,
    gemReward: 10,
    completed: false,
  },
  {
    id: "poi-2",
    name: "Senate Square Stories",
    category: "history",
    lat: 60.1695,
    lng: 24.9523,
    description: "Walk through neoclassical landmarks and uncover city founding trivia.",
    xpReward: 260,
    gemReward: 14,
    completed: false,
  },
  {
    id: "poi-3",
    name: "Kiasma Creative Corner",
    category: "art",
    lat: 60.1711,
    lng: 24.9368,
    description: "Spot bold contemporary works and complete a quick photo challenge.",
    xpReward: 240,
    gemReward: 12,
    completed: false,
  },
  {
    id: "poi-4",
    name: "Toolonlahti Nature Loop",
    category: "nature",
    lat: 60.1783,
    lng: 24.938,
    description: "Follow the waterfront path and identify birdlife around the bay.",
    xpReward: 280,
    gemReward: 16,
    completed: false,
  },
  {
    id: "poi-5",
    name: "Forum Style Sprint",
    category: "shopping",
    lat: 60.1699,
    lng: 24.9348,
    description: "Find Finnish design brands and unlock a mini bargain hunt.",
    xpReward: 200,
    gemReward: 9,
    completed: false,
  },
  {
    id: "poi-6",
    name: "Alppila Hidden Mural",
    category: "hidden",
    lat: 60.1862,
    lng: 24.9448,
    description: "Track down a tucked-away mural and scan its story marker.",
    xpReward: 320,
    gemReward: 18,
    completed: false,
  },
  {
    id: "poi-7",
    name: "Esplanadi Tasting Stop",
    category: "food",
    lat: 60.1672,
    lng: 24.9474,
    description: "Sample a seasonal pastry and collect bonus flavor points.",
    xpReward: 190,
    gemReward: 8,
    completed: false,
  },
  {
    id: "poi-8",
    name: "Uspenski Viewpoint",
    category: "history",
    lat: 60.1689,
    lng: 24.9613,
    description: "Climb to the cathedral terrace for skyline clues and past legends.",
    xpReward: 300,
    gemReward: 17,
    completed: false,
  },
];

