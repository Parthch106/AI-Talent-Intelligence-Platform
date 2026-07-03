import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { ZoomIn, ZoomOut, RotateCw, Save, X } from 'lucide-react';

interface ImageEditorModalProps {
    imageSrc: string;
    onClose: () => void;
    onSave: (croppedImageBase64: string) => void;
}

/* ─── Canvas helper: crop + rotate ─── */
const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
    });

async function getCroppedImg(
    imageSrc: string,
    pixelCrop: Area,
    rotation: number
): Promise<string> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const rad = (rotation * Math.PI) / 180;

    // Bounding box of the rotated image
    const sin = Math.abs(Math.sin(rad));
    const cos = Math.abs(Math.cos(rad));
    const bW = image.width * cos + image.height * sin;
    const bH = image.width * sin + image.height * cos;

    canvas.width = bW;
    canvas.height = bH;
    ctx.translate(bW / 2, bH / 2);
    ctx.rotate(rad);
    ctx.translate(-image.width / 2, -image.height / 2);
    ctx.drawImage(image, 0, 0);

    // Extract cropped region
    const out = document.createElement('canvas');
    out.width = pixelCrop.width;
    out.height = pixelCrop.height;
    out.getContext('2d')!.drawImage(
        canvas,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height
    );
    return out.toDataURL('image/jpeg', 0.92);
}

/* ─── Component ─── */
export const ImageEditorModal: React.FC<ImageEditorModalProps> = ({
    imageSrc,
    onClose,
    onSave,
}) => {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [processing, setProcessing] = useState(false);

    const onCropComplete = useCallback((_: Area, pixels: Area) => {
        setCroppedAreaPixels(pixels);
    }, []);

    const handleSave = async () => {
        if (!croppedAreaPixels) return;
        setProcessing(true);
        try {
            const result = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
            onSave(result);
        } catch (err) {
            console.error('Crop failed', err);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0,0,0,0.75)',
                backdropFilter: 'blur(6px)',
                padding: 16,
            }}
        >
            <div
                style={{
                    background: 'var(--bg-card, #1e1e2e)',
                    border: '1px solid var(--border-color, #333)',
                    borderRadius: 16,
                    width: '100%',
                    maxWidth: 640,
                    boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >
                {/* ── Header ── */}
                <div
                    style={{
                        padding: '14px 20px',
                        borderBottom: '1px solid var(--border-color, #333)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}
                >
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-main, #fff)' }}>
                        ✂️ Edit Image
                    </span>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-dim, #999)',
                            cursor: 'pointer',
                            padding: 4,
                            borderRadius: 8,
                            display: 'flex',
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ── Crop area — MUST have explicit height ── */}
                <div
                    style={{
                        position: 'relative',
                        width: '100%',
                        height: 400,
                        background: '#000',
                    }}
                >
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={undefined}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                        onCropComplete={onCropComplete}
                        style={{
                            containerStyle: {
                                width: '100%',
                                height: '100%',
                                position: 'relative',
                            },
                        }}
                    />
                </div>

                {/* ── Controls ── */}
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Zoom */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim, #aaa)', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <ZoomOut size={13} /> Zoom
                            </span>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim, #aaa)', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <ZoomIn size={13} />
                            </span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.05}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
                        />
                    </div>

                    {/* Rotate */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-dim, #aaa)', textTransform: 'uppercase', letterSpacing: 1, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <RotateCw size={13} /> Rotate
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main, #fff)' }}>
                                {rotation}°
                            </span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            max={360}
                            step={1}
                            value={rotation}
                            onChange={(e) => setRotation(Number(e.target.value))}
                            style={{ width: '100%', accentColor: '#a855f7', cursor: 'pointer' }}
                        />
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 4 }}>
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={processing}
                            style={{
                                padding: '8px 20px',
                                borderRadius: 10,
                                border: '1px solid var(--border-color, #444)',
                                background: 'transparent',
                                color: 'var(--text-dim, #aaa)',
                                fontWeight: 600,
                                fontSize: 13,
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={processing}
                            style={{
                                padding: '8px 24px',
                                borderRadius: 10,
                                border: 'none',
                                background: 'linear-gradient(135deg, #a855f7, #7c3aed)',
                                color: '#fff',
                                fontWeight: 700,
                                fontSize: 13,
                                cursor: processing ? 'wait' : 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6,
                                opacity: processing ? 0.6 : 1,
                            }}
                        >
                            <Save size={14} />
                            {processing ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageEditorModal;
