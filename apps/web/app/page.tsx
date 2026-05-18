import tree from '@/lib/tree-data.generated';
import Viewer from '@/components/Viewer';

export default function Page() {
  return <Viewer tree={tree} />;
}
