import { useState } from 'react';
import { cn } from '@/lib/utils';

export interface SubTab {
  id: string;
  label: string;
}

interface EntitySubTabsProps {
  tabs: SubTab[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: (activeTab: string) => React.ReactNode;
}

export function EntitySubTabs({ tabs, defaultTab, activeTab: controlledTab, onTabChange, children }: EntitySubTabsProps) {
  const [internalTab, setInternalTab] = useState(defaultTab || tabs[0]?.id || '');
  const activeTab = controlledTab ?? internalTab;

  const handleChange = (id: string) => {
    if (onTabChange) onTabChange(id);
    else setInternalTab(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-all',
              activeTab === tab.id
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children(activeTab)}
    </div>
  );
}
