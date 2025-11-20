import React from 'react';
import { useSwipeable } from 'react-swipeable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

export function SwipeableTabs({ defaultValue, children, tabs, onValueChange, className }) {
  const [activeTab, setActiveTab] = React.useState(defaultValue);
  const tabKeys = tabs.map(t => t.value);

  const handleSwipe = (direction) => {
    const currentIndex = tabKeys.indexOf(activeTab);
    let newIndex;

    if (direction === 'left') {
      newIndex = Math.min(currentIndex + 1, tabKeys.length - 1);
    } else {
      newIndex = Math.max(currentIndex - 1, 0);
    }

    const newTab = tabKeys[newIndex];
    setActiveTab(newTab);
    onValueChange?.(newTab);
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => handleSwipe('left'),
    onSwipedRight: () => handleSwipe('right'),
    trackMouse: false,
    trackTouch: true,
    delta: 50,
    preventScrollOnSwipe: false
  });

  return (
    <Tabs value={activeTab} onValueChange={(val) => {
      setActiveTab(val);
      onValueChange?.(val);
    }} className={className}>
      <TabsList className="mb-4 overflow-x-auto flex-nowrap">
        {tabs.map(tab => (
          <TabsTrigger key={tab.value} value={tab.value} className="flex-shrink-0">
            {tab.icon && <span className="mr-2">{tab.icon}</span>}
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      <div {...handlers} className="touch-pan-y">
        {children}
      </div>
    </Tabs>
  );
}

export { TabsContent };
