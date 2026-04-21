import { useState } from 'react';

import { BottomNav } from '../components/BottomNav';
import { CategoryFilter } from '../components/CategoryFilter';
import { MapView } from '../components/MapView';
import { ProfileCard } from '../components/ProfileCard';
import { categoryFilters, pois, type CategoryFilter as CategoryFilterType } from '../data/pois';
import { mockUser } from '../data/user';

export function Home() {
  const [activeCategory, setActiveCategory] = useState<CategoryFilterType>('All');

  return (
    <main className="relative h-full w-full overflow-hidden bg-cq-bg">
      <MapView pois={pois} activeCategory={activeCategory} />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[1200]">
        <div className="pointer-events-auto pt-[max(0.75rem,env(safe-area-inset-top))]">
          <ProfileCard user={mockUser} />
          <div className="mt-3">
            <CategoryFilter
              categories={categoryFilters}
              selected={activeCategory}
              onSelect={setActiveCategory}
            />
          </div>
        </div>
      </div>

      <BottomNav current="map" />
    </main>
  );
}
