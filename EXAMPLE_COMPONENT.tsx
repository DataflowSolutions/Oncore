// // Example: Shows List Component
// // This demonstrates how to use the new API client in a React component

// "use client";

// import { useState } from "react";
// import { useShows } from "@/lib/hooks/use-shows";
// import { showsApi } from "@/lib/api-client/shows";
// import type { CreateShowRequest } from "@/../backend/src/types";
// import { toast } from "sonner";

// interface ShowsListProps {
//   orgId: string;
// }

// export function ShowsList({ orgId }: ShowsListProps) {
//   const { shows, loading, error, createShow, deleteShow } = useShows(
//     orgId,
//     true
//   ); // true = upcoming only
//   const [isCreating, setIsCreating] = useState(false);

//   // Handle create show
//   async function handleCreateShow(e: React.FormEvent<HTMLFormElement>) {
//     e.preventDefault();
//     setIsCreating(true);

//     try {
//       const formData = new FormData(e.currentTarget);

//       const newShow: CreateShowRequest = {
//         org_id: orgId,
//         title: formData.get("title") as string,
//         date: formData.get("date") as string,
//         set_time: formData.get("set_time") as string,
//         venue_name: formData.get("venue_name") as string,
//         venue_city: formData.get("venue_city") as string,
//       };

//       await createShow(newShow);
//       toast.success("Show created successfully!");

//       // Reset form
//       e.currentTarget.reset();
//     } catch (err) {
//       toast.error("Failed to create show");
//       console.error(err);
//     } finally {
//       setIsCreating(false);
//     }
//   }

//   // Handle delete show
//   async function handleDeleteShow(showId: string) {
//     if (!confirm("Are you sure you want to delete this show?")) {
//       return;
//     }

//     try {
//       await deleteShow(showId);
//       toast.success("Show deleted successfully!");
//     } catch (err) {
//       toast.error("Failed to delete show");
//       console.error(err);
//     }
//   }

//   // Loading state
//   if (loading) {
//     return <div className="p-4">Loading shows...</div>;
//   }

//   // Error state
//   if (error) {
//     return (
//       <div className="p-4 text-red-600">
//         Error loading shows: {error.message}
//       </div>
//     );
//   }

//   return (
//     <div className="space-y-6">
//       {/* Create Show Form */}
//       <form
//         onSubmit={handleCreateShow}
//         className="space-y-4 p-4 border rounded"
//       >
//         <h2 className="text-xl font-bold">Create New Show</h2>

//         <div>
//           <label htmlFor="title" className="block text-sm font-medium">
//             Show Title
//           </label>
//           <input
//             type="text"
//             id="title"
//             name="title"
//             required
//             className="mt-1 block w-full rounded border p-2"
//           />
//         </div>

//         <div>
//           <label htmlFor="date" className="block text-sm font-medium">
//             Date
//           </label>
//           <input
//             type="date"
//             id="date"
//             name="date"
//             required
//             className="mt-1 block w-full rounded border p-2"
//           />
//         </div>

//         <div>
//           <label htmlFor="set_time" className="block text-sm font-medium">
//             Set Time
//           </label>
//           <input
//             type="time"
//             id="set_time"
//             name="set_time"
//             className="mt-1 block w-full rounded border p-2"
//           />
//         </div>

//         <div>
//           <label htmlFor="venue_name" className="block text-sm font-medium">
//             Venue Name
//           </label>
//           <input
//             type="text"
//             id="venue_name"
//             name="venue_name"
//             className="mt-1 block w-full rounded border p-2"
//           />
//         </div>

//         <div>
//           <label htmlFor="venue_city" className="block text-sm font-medium">
//             Venue City
//           </label>
//           <input
//             type="text"
//             id="venue_city"
//             name="venue_city"
//             className="mt-1 block w-full rounded border p-2"
//           />
//         </div>

//         <button
//           type="submit"
//           disabled={isCreating}
//           className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
//         >
//           {isCreating ? "Creating..." : "Create Show"}
//         </button>
//       </form>

//       {/* Shows List */}
//       <div className="space-y-4">
//         <h2 className="text-xl font-bold">Upcoming Shows ({shows.length})</h2>

//         {shows.length === 0 ? (
//           <p className="text-gray-500">No upcoming shows</p>
//         ) : (
//           shows.map((show) => (
//             <div
//               key={show.id}
//               className="flex items-center justify-between rounded border p-4"
//             >
//               <div>
//                 <h3 className="font-semibold">{show.title}</h3>
//                 <p className="text-sm text-gray-600">
//                   {new Date(show.date).toLocaleDateString()}
//                   {show.set_time &&
//                     ` at ${new Date(show.set_time).toLocaleTimeString()}`}
//                 </p>
//                 {show.venue && (
//                   <p className="text-sm text-gray-500">
//                     {show.venue.name}, {show.venue.city}
//                   </p>
//                 )}
//               </div>

//               <button
//                 onClick={() => handleDeleteShow(show.id)}
//                 className="rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
//               >
//                 Delete
//               </button>
//             </div>
//           ))
//         )}
//       </div>
//     </div>
//   );
// }

// // Alternative: Server Component approach (for pages that don't need interactivity)
// export async function ShowsListServer({ orgId }: ShowsListProps) {
//   const shows = await showsApi.list({ org_id: orgId, upcoming: true });

//   return (
//     <div className="space-y-4">
//       <h2 className="text-xl font-bold">Upcoming Shows ({shows.length})</h2>

//       {shows.length === 0 ? (
//         <p className="text-gray-500">No upcoming shows</p>
//       ) : (
//         shows.map((show) => (
//           <div key={show.id} className="rounded border p-4">
//             <h3 className="font-semibold">{show.title}</h3>
//             <p className="text-sm text-gray-600">
//               {new Date(show.date).toLocaleDateString()}
//             </p>
//             {show.venue && (
//               <p className="text-sm text-gray-500">
//                 {show.venue.name}, {show.venue.city}
//               </p>
//             )}
//           </div>
//         ))
//       )}
//     </div>
//   );
// }
