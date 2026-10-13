export function ChatPreview() {
  return (
    <div className="flex h-full flex-col justify-center gap-3 px-7 py-[26px]" aria-hidden>
      <div className="max-w-[78%] self-end rounded-[14px_14px_4px_14px] bg-bubble px-3.5 py-2.5 text-sm text-hi">
        Book a table for 4 at the hotel restaurant, Friday 8pm.
      </div>
      <div className="self-start rounded-[10px] border border-dashed border-amber/40 px-3.5 py-2.5 font-mono text-xs leading-[1.7] text-body">
        <span className="text-amber">tool_call</span> create_restaurant_reservation
        <br />
        {'{ guests: 4, date: "fri", time: "20:00" }'}
        <br />
        <span className="text-green">✓ 200 OK</span> · Thaïs Hotel API
      </div>
      <div className="max-w-[78%] self-start rounded-[14px_14px_14px_4px] border border-white/7 bg-bubble-alt px-3.5 py-2.5 text-sm text-mid">
        Done — your table for 4 is confirmed for Friday at 20:00.
      </div>
    </div>
  );
}
