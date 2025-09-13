import { useEffect, useMemo, useRef, useState } from "react";
import {
  Plus,
  Download,
  Upload,
  RotateCcw,
  Edit3,
  X,
  Save,
  Eraser,
  Search,
  Trash2,
  FileText,
  Inbox,
  AlertTriangle,
  Check,
  Edit2,
} from "lucide-react";

// Types
interface PostItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

type ToastKind = "default" | "success" | "error";

const storeKey = "webposts.app.v1";

const uid = () =>
  globalThis.crypto && "randomUUID" in globalThis.crypto
    ? (globalThis.crypto as Crypto).randomUUID()
    : `id-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;

const nowISO = () => new Date().toISOString();

const formatDate = (iso: string) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
};

const demoPosts = (): PostItem[] => [
  {
    id: uid(),
    title: "Welcome to your Posts App",
    content:
      "This is a demo post. Edit me inline, delete me, or create a new one from the Compose panel above.",
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
  {
    id: uid(),
    title: "Tips & Tricks",
    content:
      "- Use the search field to quickly filter posts.\n- Export/import JSON to move your data.\n- Everything is stored locally in your browser.",
    createdAt: nowISO(),
    updatedAt: nowISO(),
  },
];

// Toast system
function useToasts() {
  const [toasts, setToasts] = useState<
    { id: string; msg: string; type: ToastKind }[]
  >([]);
  const push = (msg: string, type: ToastKind = "default") => {
    const id = uid();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2200);
  };
  return { toasts, push } as const;
}

export default function Index() {
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [query, setQuery] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeTitle, setComposeTitle] = useState("");
  const [composeContent, setComposeContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { toasts, push } = useToasts();

  // Confirm dialog state with Promise resolver pattern
  const [confirmOpen, setConfirmOpen] = useState(false);
  const confirmTitleRef = useRef("Are you sure?");
  const confirmDescRef = useRef("This action cannot be undone.");
  const confirmResolver = useRef<(v: boolean) => void>();

  const askConfirm = (title?: string, desc?: string) => {
    confirmTitleRef.current = title || "Are you sure?";
    confirmDescRef.current = desc || "This action cannot be undone.";
    setConfirmOpen(true);
    return new Promise<boolean>((resolve) => {
      confirmResolver.current = resolve;
    });
  };

  // Import modal
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setPosts(parsed as PostItem[]);
          return;
        }
      }
    } catch {}
    const seed = demoPosts();
    setPosts(seed);
    localStorage.setItem(storeKey, JSON.stringify(seed));
  }, []);

  // Helpers
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.content.toLowerCase().includes(q),
    );
  }, [posts, query]);

  const postCountLabel = `${filtered.length} ${filtered.length === 1 ? "post" : "posts"}`;

  const savePosts = (next: PostItem[]) => {
    setPosts(next);
    localStorage.setItem(storeKey, JSON.stringify(next));
  };

  // Compose actions
  const clearCompose = () => {
    setComposeTitle("");
    setComposeContent("");
  };
  const createPost = () => {
    const title = composeTitle.trim();
    const content = composeContent.trim();
    if (!title || !content) {
      push("Please provide both title and content.", "error");
      return;
    }
    const post: PostItem = {
      id: uid(),
      title,
      content,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    const next = [post, ...posts];
    savePosts(next);
    clearCompose();
    setComposeOpen(false);
    push("Post created", "success");
  };

  // Edit actions
  const saveEdit = (id: string, title: string, content: string) => {
    title = title.trim();
    content = content.trim();
    if (!title || !content) {
      push("Title and content are required.", "error");
      return;
    }
    const idx = posts.findIndex((p) => p.id === id);
    if (idx === -1) return;
    const next = [...posts];
    next[idx] = { ...next[idx], title, content, updatedAt: nowISO() };
    savePosts(next);
    setEditingId(null);
    push("Post updated", "success");
  };

  const deletePost = async (id: string) => {
    const ok = await askConfirm(
      "Delete this post?",
      "You cannot undo this action.",
    );
    if (!ok) return;
    const next = posts.filter((p) => p.id !== id);
    savePosts(next);
    setEditingId((cur) => (cur === id ? null : cur));
    push("Post deleted", "success");
  };

  const clearAll = async () => {
    const ok = await askConfirm(
      "Delete all posts?",
      "This will remove every post from local storage.",
    );
    if (!ok) return;
    savePosts([]);
    push("All posts deleted", "success");
  };

  const exportJSON = () => {
    const data = JSON.stringify(posts, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "posts.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    push("Exported posts.json", "success");
  };

  const importApply = () => {
    const txt = importText.trim();
    if (!txt) {
      setImportOpen(false);
      return;
    }
    try {
      const arr = JSON.parse(txt);
      if (!Array.isArray(arr)) throw new Error("Not an array");
      const cleaned: PostItem[] = arr
        .filter(
          (p: any) =>
            p && typeof p.title === "string" && typeof p.content === "string",
        )
        .map((p: any) => ({
          id: p.id || uid(),
          title: p.title,
          content: p.content,
          createdAt: p.createdAt || nowISO(),
          updatedAt: p.updatedAt || nowISO(),
        }));
      savePosts(cleaned);
      setImportOpen(false);
      setImportText("");
      push("Imported posts", "success");
    } catch (e) {
      push("Import failed: invalid JSON", "error");
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 antialiased selection:bg-neutral-800 selection:text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Topbar */}
        <header className="flex items-center justify-between gap-4 border border-neutral-800/60 rounded-xl px-4 sm:px-6 py-3.5 bg-neutral-950/60 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-neutral-900 border border-neutral-800 grid place-items-center tracking-tight text-[13px] font-semibold">
              <span className="text-neutral-200">WP</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-[20px] sm:text-[22px] font-semibold tracking-tight text-neutral-100">
                Web Posts
              </h1>
              <p className="text-[12px] text-neutral-400 leading-tight">
                Create, read, update, and delete posts. Stored locally.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setComposeOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3.5 py-2.5 text-sm font-medium text-neutral-100 hover:bg-neutral-900 hover:border-neutral-700 hover:text-white transition-colors"
              title="New Post"
            >
              <Plus className="size-4" />
              New
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={exportJSON}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 text-sm font-medium text-neutral-200 hover:bg-neutral-900 hover:border-neutral-700 transition-colors"
                title="Export posts to JSON"
              >
                <Download className="size-4" />
                Export
              </button>
              <button
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 text-sm font-medium text-neutral-200 hover:bg-neutral-900 hover:border-neutral-700 transition-colors"
                title="Import posts from JSON"
              >
                <Upload className="size-4" />
                Import
              </button>
              <button
                onClick={() => {
                  const seed = demoPosts();
                  savePosts(seed);
                  push("Loaded demo data", "success");
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 text-sm font-medium text-neutral-200 hover:bg-neutral-900 hover:border-neutral-700 transition-colors"
                title="Load demo posts"
              >
                <RotateCcw className="size-4" />
                Demo data
              </button>
            </div>
          </div>
        </header>

        {/* Compose panel */}
        {composeOpen && (
          <section className="mt-6" aria-hidden={!composeOpen}>
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 backdrop-blur">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Edit3 className="size-4 text-neutral-400" />
                  <h2 className="text-[18px] sm:text-[20px] font-semibold tracking-tight">
                    Compose
                  </h2>
                </div>
                <button
                  onClick={() => setComposeOpen(false)}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-2.5 py-1.5 text-sm font-medium text-neutral-200 hover:bg-neutral-900 hover:border-neutral-700 transition-colors"
                  title="Close"
                >
                  <X className="size-4" />
                  Close
                </button>
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createPost();
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    createPost();
                  }
                }}
                className="p-4 sm:p-6 space-y-4"
              >
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm text-neutral-300 mb-1.5"
                  >
                    Title
                  </label>
                  <input
                    id="title"
                    value={composeTitle}
                    onChange={(e) => setComposeTitle(e.target.value)}
                    type="text"
                    required
                    placeholder="Write an engaging title..."
                    className="w-full rounded-lg bg-neutral-950/60 border border-neutral-800 px-3.5 py-2.5 text-[15px] text-neutral-100 placeholder:text-neutral-500 outline-none focus-visible:ring-2 focus-visible:ring-neutral-700/70 focus-visible:border-neutral-700 transition"
                  />
                </div>
                <div>
                  <label
                    htmlFor="content"
                    className="block text-sm text-neutral-300 mb-1.5"
                  >
                    Content
                  </label>
                  <textarea
                    id="content"
                    rows={6}
                    value={composeContent}
                    onChange={(e) => setComposeContent(e.target.value)}
                    required
                    placeholder="Share your thoughts..."
                    className="w-full rounded-lg bg-neutral-950/60 border border-neutral-800 px-3.5 py-2.5 text-[15px] text-neutral-100 placeholder:text-neutral-500 outline-none focus-visible:ring-2 focus-visible:ring-neutral-700/70 focus-visible:border-neutral-700 transition resize-y"
                  />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-neutral-500">
                    Tip: Use Cmd/Ctrl+Enter to post.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearCompose}
                      className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 text-sm font-medium text-neutral-200 hover:bg-neutral-900 hover:border-neutral-700 transition-colors"
                    >
                      <Eraser className="size-4" />
                      Clear
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-100 text-neutral-900 px-3.5 py-2.5 text-sm font-semibold hover:brightness-95 active:brightness-90 transition-colors"
                    >
                      <Save className="size-4" />
                      Save Post
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* Controls */}
        <section className="mt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="size-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                type="search"
                placeholder="Search posts..."
                className="w-full rounded-lg bg-neutral-950/60 border border-neutral-800 pl-9 pr-3.5 py-2.5 text-[15px] text-neutral-100 placeholder:text-neutral-500 outline-none focus-visible:ring-2 focus-visible:ring-neutral-700/70 focus-visible:border-neutral-700 transition"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-neutral-400">{postCountLabel}</span>
              <span className="h-6 w-px bg-neutral-800 hidden sm:inline-block" />
              <button
                onClick={clearAll}
                className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 text-sm font-medium text-neutral-200 hover:bg-neutral-900 hover:border-neutral-700 transition-colors"
                title="Delete all posts"
              >
                <Trash2 className="size-4" />
                Clear all
              </button>
            </div>
          </div>
        </section>

        {/* Posts list */}
        <main className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 p-8 text-center">
              <div className="mx-auto h-10 w-10 rounded-lg bg-neutral-900 border border-neutral-800 grid place-items-center">
                <Inbox className="size-5 text-neutral-400" />
              </div>
              <p className="mt-3 text-sm text-neutral-400">No posts yet.</p>
              <div className="mt-4">
                <button
                  onClick={() => setComposeOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3.5 py-2.5 text-sm font-medium text-neutral-200 hover:bg-neutral-900 hover:border-neutral-700 transition"
                >
                  <Plus className="size-4" />
                  Create your first post
                </button>
              </div>
            </div>
          ) : (
            filtered.map((post) => {
              const isEditing = editingId === post.id;
              return (
                <article
                  key={post.id}
                  className="rounded-xl border border-neutral-800 bg-neutral-950/60 backdrop-blur p-4 sm:p-5 hover:border-neutral-700 transition-colors"
                >
                  {isEditing ? (
                    <EditingCard
                      post={post}
                      onCancel={() => setEditingId(null)}
                      onSave={(title, content) =>
                        saveEdit(post.id, title, content)
                      }
                    />
                  ) : (
                    <ReadCard
                      post={post}
                      onEdit={() => setEditingId(post.id)}
                      onDelete={() => deletePost(post.id)}
                    />
                  )}
                </article>
              );
            })
          )}
        </main>

        {/* Footer */}
        <footer className="mt-10 text-xs text-neutral-500">
          <div className="flex items-center justify-between border-t border-neutral-900 pt-6">
            <p>Local demo. No server required.</p>
            <p>v1.0</p>
          </div>
        </footer>
      </div>

      {/* Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50" aria-hidden={!importOpen}>
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setImportOpen(false)}
          />
          <div className="relative mx-auto max-w-2xl px-4 pt-24">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 shadow-xl">
              <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-neutral-800">
                <div className="flex items-center gap-2">
                  <Upload className="size-4 text-neutral-400" />
                  <h3 className="text-[18px] font-semibold tracking-tight">
                    Import JSON
                  </h3>
                </div>
                <button
                  onClick={() => setImportOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/60 px-2.5 py-1.5 text-sm text-neutral-200 hover:bg-neutral-900 hover:border-neutral-700 transition"
                >
                  <X className="size-4" />
                  Close
                </button>
              </div>
              <div className="p-4 sm:p-6 space-y-3">
                <p className="text-sm text-neutral-400">
                  Paste an array of posts or the export from this app. Schema:{" "}
                  {"{"} id, title, content, createdAt, updatedAt {"}"}.
                </p>
                <textarea
                  rows={10}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full rounded-lg bg-neutral-950/60 border border-neutral-800 px-3.5 py-2.5 text-[14px] text-neutral-100 placeholder:text-neutral-500 outline-none focus-visible:ring-2 focus-visible:ring-neutral-700/70 focus-visible:border-neutral-700 transition resize-y"
                  placeholder='[{"id":"...","title":"Example","content":"Body","createdAt":"...","updatedAt":"..."}]'
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() =>
                      setImportText(JSON.stringify(demoPosts(), null, 2))
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 text-sm font-medium text-neutral-200 hover:bg-neutral-900 hover:border-neutral-700 transition-colors"
                    title="Load demo JSON"
                  >
                    <SparklesIcon />
                    Fill demo
                  </button>
                  <button
                    onClick={importApply}
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-100 text-neutral-900 px-3.5 py-2.5 text-sm font-semibold hover:brightness-95 active:brightness-90 transition-colors"
                  >
                    <Check className="size-4" />
                    Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50" aria-hidden={!confirmOpen}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative mx-auto max-w-md px-4 pt-28">
            <div className="rounded-xl border border-neutral-800 bg-neutral-950 shadow-xl">
              <div className="px-4 sm:px-6 py-5 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 rounded-lg bg-neutral-900 border border-neutral-800 grid place-items-center">
                    <AlertTriangle className="size-5 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-[18px] font-semibold tracking-tight">
                      {confirmTitleRef.current}
                    </h4>
                    <p className="text-sm text-neutral-400">
                      {confirmDescRef.current}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 pt-4">
                  <button
                    onClick={() => {
                      setConfirmOpen(false);
                      confirmResolver.current?.(false);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 text-sm text-neutral-200 hover:bg-neutral-900 hover:border-neutral-700 transition"
                  >
                    <X className="size-4" />
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setConfirmOpen(false);
                      confirmResolver.current?.(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-100 text-neutral-900 px-3.5 py-2.5 text-sm font-semibold hover:brightness-95 active:brightness-90 transition"
                  >
                    <Check className="size-4" />
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed right-4 bottom-4 z-50 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={
              "rounded-lg border px-3.5 py-2.5 text-sm shadow-lg bg-neutral-950/90 backdrop-blur transition" +
              " " +
              (t.type === "success"
                ? "border-emerald-600/60 text-emerald-200"
                : t.type === "error"
                  ? "border-red-600/60 text-red-200"
                  : "border-neutral-700 text-neutral-200")
            }
          >
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReadCard({
  post,
  onEdit,
  onDelete,
}: {
  post: PostItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const bodyPreview =
    post.content.length > 220 ? post.content.slice(0, 220) + "…" : post.content;
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h3 className="text-[18px] sm:text-[19px] font-semibold tracking-tight text-neutral-100 line-clamp-1">
          {post.title || "(Untitled)"}
        </h3>
        <p className="mt-1 text-sm text-neutral-400 whitespace-pre-line">
          {bodyPreview || "(No content)"}
        </p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-2">
        <div className="text-[11px] text-neutral-500">
          Created {formatDate(post.createdAt)}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/60 px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-neutral-900 hover:border-neutral-700 transition"
            title="Edit"
          >
            <Edit2 className="size-3.5" />
            Edit
          </button>
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/60 px-2.5 py-1.5 text-xs text-red-300/90 hover:bg-neutral-900 hover:border-neutral-700 hover:text-red-200 transition"
            title="Delete"
          >
            <Trash2 className="size-3.5" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function EditingCard({
  post,
  onCancel,
  onSave,
}: {
  post: PostItem;
  onCancel: () => void;
  onSave: (title: string, content: string) => void;
}) {
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  return (
    <div>
      <div className="flex items-center justify-between pb-3 border-b border-neutral-900/80">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-neutral-400" />
          <span className="text-sm text-neutral-400">Editing</span>
        </div>
        <span className="text-xs text-neutral-500">
          Last updated {formatDate(post.updatedAt)}
        </span>
      </div>
      <div className="mt-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg bg-neutral-950/60 border border-neutral-800 px-3.5 py-2.5 text-[15px] text-neutral-100 placeholder:text-neutral-500 outline-none focus-visible:ring-2 focus-visible:ring-neutral-700/70 focus-visible:border-neutral-700 transition"
          placeholder="Title"
        />
        <textarea
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-lg bg-neutral-950/60 border border-neutral-800 px-3.5 py-2.5 text-[15px] text-neutral-100 placeholder:text-neutral-500 outline-none focus-visible:ring-2 focus-visible:ring-neutral-700/70 focus-visible:border-neutral-700 transition resize-y"
          placeholder="Write here..."
        />
      </div>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-2.5 text-sm text-neutral-200 hover:bg-neutral-900 hover:border-neutral-700 transition"
        >
          <X className="size-4" />
          Cancel
        </button>
        <button
          onClick={() => onSave(title, content)}
          className="inline-flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-100 text-neutral-900 px-3.5 py-2.5 text-sm font-semibold hover:brightness-95 active:brightness-90 transition"
        >
          <Save className="size-4" />
          Save
        </button>
      </div>
    </div>
  );
}

function SparklesIcon() {
  // small inline icon to avoid extra dependency
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
    >
      <path d="M5 3v4M3 5h4" />
      <path d="M19 13v4M17 15h4" />
      <path d="M11 7l1.5 3L16 11l-3.5 1L11 15l-1.5-3L6 11l3.5-1L11 7z" />
    </svg>
  );
}
