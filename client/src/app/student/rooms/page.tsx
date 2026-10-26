export default function StudentRoomsStub() {
  if (typeof window !== 'undefined') window.location.replace('/student/floor-map')
  return (
    <div className="p-8 text-slate-800">
      <h1 className="text-xl font-bold">Room Selection Preview</h1>
      <p className="text-xs text-slate-500 mt-1">Ready for Phase 3 Floor Map.</p>
    </div>
  );
}