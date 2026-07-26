"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Label,
  PageHeader,
  Textarea,
  useToast,
} from "@/components/ui";
import type { IdeaCard } from "@/lib/types";

export function IdeasPanel({ embedded = false }: { embedded?: boolean }) {
  const { push } = useToast();
  const [ideas, setIdeas] = useState<IdeaCard[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Couples Portraits");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("wedding");
  const [file, setFile] = useState<File | null>(null);

  async function load() {
    const res = await fetch("/api/ideas");
    if (!res.ok) {
      push("Could not load ideas", "danger");
      return;
    }
    const data = await res.json();
    setIdeas(data.ideas || []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const form = new FormData();
    form.set("title", title);
    form.set("category", category);
    form.set("notes", notes);
    form.set("tags", tags);
    if (file) form.set("file", file);
    const res = await fetch("/api/ideas", { method: "POST", body: form });
    if (!res.ok) {
      push("Could not save idea", "danger");
      return;
    }
    const data = await res.json();
    setIdeas((prev) => [data.idea, ...prev]);
    setTitle("");
    setNotes("");
    setFile(null);
    push("Idea saved", "success");
  }

  return (
    <div>
      {!embedded ? (
        <PageHeader
          title="Shoot ideas"
          description="Reusable pose and moment ideas — add a reference photo when it helps."
        />
      ) : (
        <h2 className="mb-4 font-display text-2xl">Ideas</h2>
      )}
      <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <Card className="p-5">
          <h3 className="mb-4 font-display text-xl">Add idea</h3>
          <form onSubmit={onCreate} className="space-y-4">
            <Field>
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </Field>
            <Field>
              <Label htmlFor="cat">Category</Label>
              <Input
                id="cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="cats"
              />
              <datalist id="cats">
                <option value="Getting Ready" />
                <option value="First Look" />
                <option value="Ceremony" />
                <option value="Family Formals" />
                <option value="Couples Portraits" />
                <option value="Details" />
                <option value="Reception" />
              </datalist>
            </Field>
            <Field>
              <Label htmlFor="notes">Direction notes</Label>
              <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Field hint="Optional reference photo">
              <Label htmlFor="photo">Reference photo</Label>
              <input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Field>
            <Field hint="Comma-separated">
              <Label htmlFor="tags">Tags</Label>
              <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} />
            </Field>
            <Button type="submit">Save idea</Button>
          </form>
        </Card>

        {ideas.length === 0 ? (
          <EmptyState title="No ideas yet" description="Add poses and moments you’ll reuse." />
        ) : (
          <ul className="space-y-3">
            {ideas.map((idea) => (
              <li key={idea.id}>
                <Card className="flex items-start justify-between gap-3 p-4">
                  <div className="flex gap-3">
                    {idea.referenceImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={idea.referenceImageUrl}
                        alt=""
                        className="h-16 w-16 rounded-md object-cover"
                      />
                    ) : null}
                    <div>
                      <p className="text-sm text-muted">{idea.category}</p>
                      <p className="font-medium">{idea.title}</p>
                      {idea.notes ? (
                        <p className="mt-1 text-sm text-muted">{idea.notes}</p>
                      ) : null}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    tone="ghost"
                    onClick={async () => {
                      const res = await fetch(`/api/ideas/${idea.id}`, {
                        method: "DELETE",
                      });
                      if (!res.ok) {
                        push("Delete failed", "danger");
                        return;
                      }
                      setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
                    }}
                  >
                    Delete
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
