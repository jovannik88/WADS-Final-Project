import { getApiDocs } from '@/lib/swagger';
import ReactSwagger from './ReactSwagger';

export default async function IndexPage() {
  const spec = await getApiDocs();
  return (
    <section className="container mx-auto p-4">
      <ReactSwagger spec={spec} />
    </section>
  );
}