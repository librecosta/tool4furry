import { useState } from 'react';
import { Button } from '../../src/ui/Button';
import type { ToolProps } from '../../src/tools/types';

export default function FixtureTool({ locale }: ToolProps) {
  const [count, setCount] = useState(0);
  return (
    <div data-fixture-counter>
      <p>
        {locale === 'zh'
          ? '仅测试水合，不是已发布工具'
          : 'Hydration fixture, not a published product'}
      </p>
      <Button onClick={() => setCount((value) => value + 1)}>
        {locale === 'zh' ? '测试计数' : 'Test counter'}: {count}
      </Button>
    </div>
  );
}
