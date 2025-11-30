import { getImportJobById } from "@/lib/import/jobs";
import { notFound } from "next/navigation";

export default async function ImportJobPage({ params }: { params: { org: string; jobId: string } }) {
  const job = await getImportJobById(params.jobId);
  if (!job) return notFound();

  return (
    <main className="max-w-3xl mx-auto py-12">
      <h1 className="text-2xl font-bold mb-4">Import Job Result</h1>
      <div className="mb-6">
        <div><strong>Job ID:</strong> {job.id}</div>
        <div><strong>Status:</strong> {job.status}</div>
      </div>
      <pre className="bg-gray-100 p-4 rounded text-xs overflow-x-auto">
        {JSON.stringify(job.extracted, null, 2)}
      </pre>
    </main>
  );
}
