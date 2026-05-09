"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  deletePhotoAction,
  uploadPhotoAction,
} from "@/app/(mobile)/orden/[id]/actions";
import type { PhotoStage } from "@/lib/types";

interface ExistingPhoto {
  id: string;
  photoUrl: string;
  caption: string;
}

interface Props {
  workOrderId: string;
  workOrderServiceId: string | null;
  stage: PhotoStage;
  photos: ExistingPhoto[];
  emptyHint?: string;
  readOnly?: boolean;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function PhotoUploader({
  workOrderId,
  workOrderServiceId,
  stage,
  photos,
  emptyHint,
  readOnly = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick() {
    inputRef.current?.click();
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    start(async () => {
      try {
        for (const f of Array.from(files)) {
          // Cap: simple resize via canvas could go here. For demo, send as-is.
          const dataUrl = await fileToDataUrl(f);
          await uploadPhotoAction({
            workOrderId,
            workOrderServiceId,
            stage,
            caption: "",
            dataUrl,
          });
        }
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      await deletePhotoAction(id);
    });
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {photos.map((p) => (
          <div
            key={p.id}
            className="relative aspect-square rounded-lg overflow-hidden bg-bg-secondary border border-border-tertiary"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.photoUrl}
              alt={p.caption || "Foto"}
              className="w-full h-full object-cover"
            />
            {!readOnly && (
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center"
                aria-label="Eliminar"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        {!readOnly && (
          <button
            type="button"
            onClick={pick}
            disabled={pending}
            className="aspect-square rounded-lg border-2 border-dashed border-border-secondary bg-bg-secondary flex flex-col items-center justify-center text-text-tertiary hover:bg-bg-primary"
          >
            <Camera size={28} />
            <span className="text-[11px] mt-1">Tomar foto</span>
          </button>
        )}
      </div>

      {!readOnly && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => onFiles(e.currentTarget.files)}
        />
      )}

      {photos.length === 0 && emptyHint && (
        <div className="text-[11px] text-text-secondary mb-2">{emptyHint}</div>
      )}

      {error && (
        <div className="text-[11px] text-text-danger mb-2">{error}</div>
      )}

      {!readOnly && (
        <Button onClick={pick} disabled={pending} className="w-full justify-center">
          {pending ? "Subiendo…" : "＋ Agregar fotos"}
        </Button>
      )}
    </div>
  );
}
