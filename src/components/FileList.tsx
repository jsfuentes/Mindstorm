export default function FileList({
  entries,
  fileCount,
  expanded,
  onToggle,
}: {
  entries: string[];
  fileCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const preview = entries.slice(0, 3);
  const hasMore = entries.length > 3;
  const visible = expanded ? entries : preview;

  return (
    <div className="space-y-1">
      <p className="text-xs text-green-600">{fileCount} files found</p>
      <div className="bg-gray-900 text-gray-300 rounded-md p-2 font-mono text-xs leading-relaxed">
        {visible.map((name) => (
          <div key={name}>{name}</div>
        ))}
        {hasMore && (
          <button
            onClick={onToggle}
            className="text-blue-400 hover:text-blue-300 mt-1"
          >
            {expanded ? "show less" : `+ ${entries.length - 3} more`}
          </button>
        )}
      </div>
    </div>
  );
}
