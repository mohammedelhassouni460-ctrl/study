"use client";

import { Loader2Icon, UploadIcon } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { initials } from "@/components/app/user-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { updateAvatarAction } from "@/lib/actions/settings";
import { createClient } from "@/lib/supabase/client";

const MAX_SIZE = 2 * 1024 * 1024;
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export function AvatarUploader({
  userId,
  avatarUrl,
  name,
  email,
}: {
  userId: string;
  avatarUrl: string | null;
  name: string | null;
  email: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(avatarUrl);
  const [pending, setPending] = useState(false);

  const upload = async (file: File) => {
    const ext = TYPES[file.type];
    if (!ext) return toast.error("Formats acceptés : PNG, JPEG ou WebP.");
    if (file.size > MAX_SIZE) return toast.error("Image trop lourde (2 Mo maximum).");
    setPending(true);
    try {
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const supabase = createClient();
      const { error } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw new Error("L'envoi de l'image a échoué.");
      const result = await updateAvatarAction(path);
      if (!result.ok) throw new Error(result.error);
      setUrl(supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl);
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'envoi de l'image a échoué.");
    } finally {
      setPending(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async () => {
    setPending(true);
    const result = await updateAvatarAction(null);
    setPending(false);
    if (!result.ok) return toast.error(result.error);
    setUrl(null);
    toast.success(result.message);
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="size-16">
        {url && <AvatarImage src={url} alt="" />}
        <AvatarFallback className="text-lg">{initials(name, email)}</AvatarFallback>
      </Avatar>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          id="avatar-input"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
        />
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
          {pending ? <Loader2Icon className="animate-spin" /> : <UploadIcon />} Changer la photo
        </Button>
        {url && (
          <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={remove}>
            Supprimer
          </Button>
        )}
      </div>
    </div>
  );
}
