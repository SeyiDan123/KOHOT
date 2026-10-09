import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Check, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Move, 
  Crop
} from 'lucide-react';
import { useStaticBackdropScrollLock } from '../../utils/useStaticBackdropScrollLock';

export type CropAspectRatio = 'free' | '1:1' | '4:5' | '16:9' | '21:9' | 'portrait' | 'square' | 'landscape';

export interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onApplyCrop: (croppedDataUrl: string) => void;
  initialAspectRatio?: CropAspectRatio | string;
  title?: string;
  helperText?: string;
  isProfileSubmission?: boolean;
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  onClose,
  onApplyCrop,
  initialAspectRatio = '4:5',
  title,
  helperText,
  isProfileSubmission = false,
}) => {
  useStaticBackdropScrollLock(isOpen);

  // Normalize target aspect ratio: 4:5 portrait for profiles, 1:1 square for awards/avatars, 16:9 for landscape
  const targetAspect = (() => {
    if (isProfileSubmission) return 4 / 5;
    const str = String(initialAspectRatio).toLowerCase();
    if (str === 'portrait' || str === '4:5') return 4 / 5;
    if (str === 'square' || str === '1:1') return 1;
    if (str === 'landscape' || str === '16:9') return 16 / 9;
    if (str === '21:9') return 21 / 9;
    return 4 / 5; // Default standard portrait frame
  })();

  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Image layout inside container
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 800, height: 600 });
  const [displayedImgSize, setDisplayedImgSize] = useState<{ width: number; height: number }>({ width: 360, height: 270 });
  
  // Crop frame dimensions and position (offset from center of image)
  const [frameSize, setFrameSize] = useState<{ width: number; height: number }>({ width: 200, height: 250 });
  const [framePos, setFramePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 }); // offset from image center

  // Dragging state for moving the crop frame across the image
  const [isDraggingFrame, setIsDraggingFrame] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; startPosX: number; startPosY: number }>({
    clientX: 0,
    clientY: 0,
    startPosX: 0,
    startPosY: 0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Calculate layout when image loads or container resizes
  const setupLayout = useCallback((nw: number, nh: number, currentZoom: number = 1) => {
    if (!nw || !nh) return;
    const containerW = containerRef.current?.clientWidth || 460;
    const containerH = containerRef.current?.clientHeight || 360;

    const imgAspect = nw / nh;
    let baseW = containerW - 24;
    let baseH = baseW / imgAspect;
    if (baseH > containerH - 24) {
      baseH = containerH - 24;
      baseW = baseH * imgAspect;
    }

    const dispW = Math.round(baseW * currentZoom);
    const dispH = Math.round(baseH * currentZoom);
    setDisplayedImgSize({ width: dispW, height: dispH });

    // Calculate crop frame size according to the exact target aspect ratio
    // The frame fits within the base unzoomed image dimension so user can position it easily
    let fH = Math.min(baseH * 0.9, containerH - 40);
    let fW = fH * targetAspect;
    if (fW > Math.min(baseW * 0.9, containerW - 40)) {
      fW = Math.min(baseW * 0.9, containerW - 40);
      fH = fW / targetAspect;
    }

    const finalW = Math.round(Math.max(fW, 100));
    const finalH = Math.round(Math.max(fH, 100 / targetAspect));
    setFrameSize({ width: finalW, height: finalH });

    // Keep frame within image bounds
    clampFramePosition(framePos.x, framePos.y, finalW, finalH, dispW, dispH);
  }, [targetAspect]);

  const clampFramePosition = (px: number, py: number, fW: number, fH: number, imgW: number, imgH: number) => {
    const maxX = Math.max(0, (imgW - fW) / 2);
    const maxY = Math.max(0, (imgH - fH) / 2);
    const clampedX = Math.max(-maxX, Math.min(maxX, px));
    const clampedY = Math.max(-maxY, Math.min(maxY, py));
    setFramePos({ x: clampedX, y: clampedY });
    return { x: clampedX, y: clampedY };
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const nw = img.naturalWidth || 800;
    const nh = img.naturalHeight || 600;
    setNaturalSize({ width: nw, height: nh });
    setFramePos({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setupLayout(nw, nh, 1);
  };

  useEffect(() => {
    if (naturalSize.width > 0) {
      setupLayout(naturalSize.width, naturalSize.height, zoom);
    }
  }, [zoom, targetAspect, setupLayout, naturalSize]);

  // Pointer drag events for moving the crop frame across the image
  const handleFramePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    setIsDraggingFrame(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startPosX: framePos.x,
      startPosY: framePos.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingFrame) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    const nextX = dragStartRef.current.startPosX + dx;
    const nextY = dragStartRef.current.startPosY + dy;

    clampFramePosition(nextX, nextY, frameSize.width, frameSize.height, displayedImgSize.width, displayedImgSize.height);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (isDraggingFrame) {
      setIsDraggingFrame(false);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {}
    }
  };

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowUp') {
        setFramePos(p => ({ ...p, y: p.y - 10 }));
      } else if (e.key === 'ArrowDown') {
        setFramePos(p => ({ ...p, y: p.y + 10 }));
      } else if (e.key === 'ArrowLeft') {
        setFramePos(p => ({ ...p, x: p.x - 10 }));
      } else if (e.key === 'ArrowRight') {
        setFramePos(p => ({ ...p, x: p.x + 10 }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Execute Canvas Crop: extracts the exact portion framed by the movable box
  const executeCrop = useCallback(() => {
    const img = imageRef.current;
    if (!img) return;

    const nw = naturalSize.width;
    const nh = naturalSize.height;

    // Scale ratio between natural image and displayed image
    const scaleX = nw / displayedImgSize.width;
    const scaleY = nh / displayedImgSize.height;

    // Frame center relative to image center
    const centerImgX = displayedImgSize.width / 2;
    const centerImgY = displayedImgSize.height / 2;

    const frameLeftInDisp = centerImgX + framePos.x - frameSize.width / 2;
    const frameTopInDisp = centerImgY + framePos.y - frameSize.height / 2;

    // Convert to natural image coordinates
    let naturalCropX = Math.round(frameLeftInDisp * scaleX);
    let naturalCropY = Math.round(frameTopInDisp * scaleY);
    let naturalCropW = Math.round(frameSize.width * scaleX);
    let naturalCropH = Math.round(frameSize.height * scaleY);

    naturalCropX = Math.max(0, Math.min(nw - naturalCropW, naturalCropX));
    naturalCropY = Math.max(0, Math.min(nh - naturalCropH, naturalCropY));
    naturalCropW = Math.min(naturalCropW, nw);
    naturalCropH = Math.min(naturalCropH, nh);

    const canvas = document.createElement('canvas');
    const targetW = 720;
    const targetH = Math.round(targetW / targetAspect);
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      onApplyCrop(imageSrc);
      onClose();
      return;
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    if (rotation !== 0) {
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    try {
      ctx.drawImage(
        img,
        naturalCropX,
        naturalCropY,
        naturalCropW,
        naturalCropH,
        0,
        0,
        targetW,
        targetH
      );
      if (rotation !== 0) {
        ctx.restore();
      }

      const croppedDataUrl = canvas.toDataURL('image/webp', 0.90);
      onApplyCrop(croppedDataUrl);
      onClose();
    } catch {
      try {
        const fallbackUrl = canvas.toDataURL('image/jpeg', 0.90);
        onApplyCrop(fallbackUrl);
        onClose();
      } catch {
        onApplyCrop(imageSrc);
        onClose();
      }
    }
  }, [naturalSize, displayedImgSize, framePos, frameSize, targetAspect, rotation, onApplyCrop, onClose, imageSrc]);

  if (!isOpen || !imageSrc) return null;

  const resolvedTitle = title || (isProfileSubmission ? 'Position Portrait Photo' : 'Crop & Frame Photo');
  const resolvedHelper = helperText || 'Move the frame across your photo to capture the area needed for the album.';

  const modalElement = (
    <div 
      id="image-crop-modal-backdrop"
      className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn select-none"
      onClick={onClose}
    >
      <div 
        id="image-crop-modal-dialog"
        className="relative w-full max-w-xl bg-[#14151b] border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-white/10 bg-[#1a1c26]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-syne font-bold text-sm sm:text-base text-white">
                {resolvedTitle}
              </h3>
              <p className="font-mono-tech text-[11px] text-zinc-400">
                {resolvedHelper}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 border border-white/10 text-white/70 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crop Viewport Area: Stationary Image with Movable Highlight Frame */}
        <div className="p-4 sm:p-6 flex-1 flex flex-col items-center justify-center bg-[#0d0e14] overflow-hidden">
          <div 
            ref={containerRef}
            className="relative w-full max-w-lg h-[340px] sm:h-[380px] bg-black/90 rounded-2xl overflow-hidden border border-white/15 flex items-center justify-center select-none shadow-inner"
          >
            {/* Stationary Image */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Crop target"
              crossOrigin={imageSrc?.startsWith('http') ? 'anonymous' : undefined}
              onLoad={handleImageLoad}
              className="pointer-events-none transition-transform duration-100 ease-out select-none"
              style={{
                width: `${displayedImgSize.width}px`,
                height: `${displayedImgSize.height}px`,
                maxWidth: 'none',
                transform: `rotate(${rotation}deg)`,
                transformOrigin: 'center center',
              }}
              draggable={false}
            />

            {/* Dark mask overlay around the movable frame */}
            <div 
              className="absolute inset-0 pointer-events-none flex items-center justify-center"
            >
              {/* Movable Crop Frame with Golden Border */}
              <div 
                onPointerDown={handleFramePointerDown}
                className="border-2 border-amber-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] rounded-lg relative cursor-move pointer-events-auto touch-none transition-shadow active:shadow-[0_0_0_9999px_rgba(0,0,0,0.75)]"
                style={{
                  width: `${frameSize.width}px`,
                  height: `${frameSize.height}px`,
                  transform: `translate(${framePos.x}px, ${framePos.y}px)`,
                }}
              >
                {/* Rule-of-thirds grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-30">
                  <div className="border-r border-b border-white/50" />
                  <div className="border-r border-b border-white/50" />
                  <div className="border-b border-white/50" />
                  <div className="border-r border-b border-white/50" />
                  <div className="border-r border-b border-white/50" />
                  <div className="border-b border-white/50" />
                  <div className="border-r border-b border-white/50" />
                  <div className="border-r border-b border-white/50" />
                  <div />
                </div>

                {/* Corner Accents */}
                <div className="absolute -top-1 -left-1 w-3.5 h-3.5 border-t-2 border-l-2 border-amber-300 pointer-events-none" />
                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 border-t-2 border-r-2 border-amber-300 pointer-events-none" />
                <div className="absolute -bottom-1 -left-1 w-3.5 h-3.5 border-b-2 border-l-2 border-amber-300 pointer-events-none" />
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 border-b-2 border-r-2 border-amber-300 pointer-events-none" />

                {/* Move Handle Badge in center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2.5 py-1 rounded-full bg-black/75 backdrop-blur-sm border border-white/20 text-[10px] font-mono-tech text-white/90 flex items-center gap-1 pointer-events-none opacity-80 shadow">
                  <Move className="w-3 h-3 text-amber-400" />
                  <span>Drag frame</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Helper Controls Below Viewport */}
          <div className="flex items-center justify-between w-full max-w-lg mt-3 text-xs font-mono-tech text-zinc-400">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Rotate 90 degrees"
              >
                <RotateCw className="w-3 h-3" />
                <span>Rotate</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setFramePos({ x: 0, y: 0 });
                  setZoom(1);
                  setRotation(0);
                }}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Center
              </button>
            </div>

            {/* Subtle Zoom Slider */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(1, Number((z - 0.1).toFixed(2))))}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-20 sm:w-28 accent-amber-400 h-1 bg-white/20 rounded-lg cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 sm:px-6 py-3.5 border-t border-white/10 bg-[#161822] flex items-center justify-between">
          <span className="text-[11px] font-mono-tech text-zinc-400 hidden xs:inline">
            Matches final display format
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-zinc-300 font-mono-tech text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={executeCrop}
              className="px-5 py-2 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-syne font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-md active:scale-95"
            >
              <Check className="w-3.5 h-3.5 text-slate-950" />
              <span>Apply &amp; Crop</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalElement, document.body);
  }
  return modalElement;
};
