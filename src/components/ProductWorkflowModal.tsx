import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GuidedWorkflow } from './GuidedWorkflow';
import {
  X,
  Upload,
  Camera,
  SwitchCamera,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Aperture
} from 'lucide-react';

type CaptureRatioKey = '1:1' | '4:5' | '4:3';

const CAPTURE_RATIOS: Record<
  CaptureRatioKey,
  { label: string; myLabel: string; aspectClass: string; width: number; height: number; ratio: number }
> = {
  '1:1': {
    label: '1:1 Square',
    myLabel: '1:1 စတုရန်း (Default)',
    aspectClass: 'aspect-square',
    width: 1080,
    height: 1080,
    ratio: 1,
  },
  '4:5': {
    label: '4:5 Portrait',
    myLabel: '4:5 ဒေါင်လိုက်',
    aspectClass: 'aspect-[4/5]',
    width: 1080,
    height: 1350,
    ratio: 4 / 5,
  },
  '4:3': {
    label: '4:3 Classic',
    myLabel: '4:3 အလျားလိုက်',
    aspectClass: 'aspect-[4/3]',
    width: 1200,
    height: 900,
    ratio: 4 / 3,
  },
};

export const ProductWorkflowModal = ({
  isOpen,
  onClose,
  formData,
  setFormData,
  handleSaveProduct,
  lang,
  editingProduct,
  formError,
  handleFileUpload,
  onImageFileSelected,
  hasSelectedFile,
  uploadingImage,
  uploadError,
  uploadSuccessMessage,
  localImagePreview,
  setLocalImagePreview,
  analyzingImage,
  aiAnalysisError,
  aiAnalysisApplied,
  aiAnalysisMeta,
  onReanalyzeImage,
  handleAddVariantRow,
  handleRemoveVariantRow,
}: any) => {
  const [captureRatio, setCaptureRatio] = useState<CaptureRatioKey>('1:1');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturingShot, setCapturingShot] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore track stop error
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setCameraLoading(false);
  }, []);

  // Stop stream whenever modal closes or component unmounts
  useEffect(() => {
    if (!isOpen) {
      stopCameraStream();
      setCameraError(null);
    }
  }, [isOpen, stopCameraStream]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch {
            // ignore
          }
        });
        streamRef.current = null;
      }
    };
  }, []);

  // Attach MediaStream after <video> mounts
  useEffect(() => {
    if (isCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        // Auto-play guard on some browsers
      });
    }
  }, [isCameraOpen]);

  const startCamera = async (targetFacingMode: 'environment' | 'user' = facingMode) => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        lang === 'my'
          ? 'ဤ Browser တွင် Live Camera မထောက်ပံ့ပါ။ အောက်ပါ Camera / Gallery ခလုတ်မှတဆင့် ရိုက်တင်နိုင်ပါသည်။'
          : 'Live camera API is not supported in this browser. Please use the device camera or upload button below.'
      );
      return;
    }

    // Release any previous stream first
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setCameraLoading(true);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: targetFacingMode },
            width: { ideal: 1280 },
            height: { ideal: 1280 },
          },
          audio: false,
        });
      } catch (constraintErr: any) {
        if (
          constraintErr?.name === 'OverconstrainedError' ||
          constraintErr?.name === 'ConstraintNotSatisfiedError'
        ) {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw constraintErr;
        }
      }

      streamRef.current = stream;
      setFacingMode(targetFacingMode);
      setIsCameraOpen(true);
    } catch (err: any) {
      let message =
        lang === 'my'
          ? 'Camera ဖွင့်၍မရပါ။ Browser Permission ကို Allow ပေးပြီး ထပ်စမ်းကြည့်ပါ။'
          : 'Unable to access camera. Please allow camera permission and try again.';

      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        message =
          lang === 'my'
            ? 'Camera အသုံးပြုခွင့် ပိတ်ထားပါသည်။ Browser Address Bar မှ Camera Permission ကို Allow ပေးပါ သို့မဟုတ် အောက်ပါ Device Camera ခလုတ်ကို သုံးပါ။'
            : 'Camera permission was denied. Please allow camera access in your browser settings or use the fallback capture below.';
      } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
        message =
          lang === 'my'
            ? 'ဤစက်တွင် Camera ရှာမတွေ့ပါ။ ဖိုင်မှ ပုံရွေးတင်နိုင်ပါသည်။'
            : 'No camera device found. Please upload a photo from your device.';
      }
      setCameraError(message);
      setIsCameraOpen(false);
    } finally {
      setCameraLoading(false);
    }
  };

  const handleSwitchCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    startCamera(nextFacing);
  };

  const handleCapturePhoto = async () => {
    const video = videoRef.current;
    if (!video || video.videoWidth <= 0 || video.videoHeight <= 0 || capturingShot) return;

    setCapturingShot(true);
    setCameraError(null);
    try {
      const ratioCfg = CAPTURE_RATIOS[captureRatio];
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const videoRatio = vw / vh;
      const targetRatio = ratioCfg.ratio;

      let sx = 0;
      let sy = 0;
      let sw = vw;
      let sh = vh;

      if (videoRatio > targetRatio) {
        sw = Math.round(vh * targetRatio);
        sx = Math.round((vw - sw) / 2);
      } else if (videoRatio < targetRatio) {
        sh = Math.round(vw / targetRatio);
        sy = Math.round((vh - sh) / 2);
      }

      const canvas = document.createElement('canvas');
      canvas.width = ratioCfg.width;
      canvas.height = ratioCfg.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Canvas context unavailable');
      }

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.92)
      );

      if (!blob) {
        throw new Error('Failed to encode captured image');
      }

      const file = new File([blob], `product_cam_${Date.now()}.jpg`, {
        type: 'image/jpeg',
      });

      stopCameraStream();

      if (onImageFileSelected) {
        await onImageFileSelected(file);
      } else if (handleFileUpload) {
        await handleFileUpload({ target: { files: [file] } });
      }
    } catch (err: any) {
      setCameraError(
        err?.message ||
          (lang === 'my'
            ? 'ဓာတ်ပုံရိုက်ယူရာတွင် အမှားဖြစ်နေပါသည်။ ထပ်စမ်းကြည့်ပါ။'
            : 'Failed to capture photo. Please try again.')
      );
    } finally {
      setCapturingShot(false);
    }
  };

  const handleModalClose = () => {
    stopCameraStream();
    onClose();
  };

  if (!isOpen) return null;

  const previewImageSrc = formData.imageUrl || localImagePreview || '';
  const totalVariantStock = (formData.variants || []).reduce(
    (sum: number, v: any) => sum + (Number(v.stock) || 0),
    0
  );
  const activeRatio = CAPTURE_RATIOS[captureRatio];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-4 overflow-y-auto transition-all duration-300">
      <div className="bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-none sm:rounded-3xl w-full max-w-lg shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden h-full sm:h-auto sm:max-h-[90vh] flex flex-col my-auto text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-slate-900/80 backdrop-blur-xl">
          <h3 className="text-base font-bold text-white tracking-tight">
            {editingProduct
              ? lang === 'my'
                ? 'ကုန်ပစ္စည်း ပြင်ဆင်ရန်'
                : 'Edit Product'
              : lang === 'my'
              ? 'ကုန်ပစ္စည်း အသစ်ထည့်သွင်းရန်'
              : 'Add New Product'}
          </h3>
          <button
            type="button"
            onClick={handleModalClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <GuidedWorkflow
          lang={lang}
          onClose={handleModalClose}
          onFinish={handleSaveProduct}
          finishLabel={lang === 'my' ? 'သိမ်းဆည်းမည်' : 'Save Product'}
          steps={[
            {
              title: lang === 'my' ? 'ပုံရိုက်/တင်ခြင်း နှင့် AI ခွဲခြမ်းစိတ်ဖြာမှု' : 'Capture / Upload & AI Analysis',
              instruction:
                lang === 'my'
                  ? 'App ထဲမှ Camera ဖြင့် Product Photo Size အတိုင်း တိုက်ရိုက်ရိုက်ပါ (သို့) ဖိုင်မှတင်ပါ — AI မှ အချက်အလက်များ ကြိုတင်ဖြည့်ပေးပါမည်။'
                  : 'Take a live photo sized to your product frame or upload from gallery — AI will pre-fill product details.',
              canNext: !analyzingImage && !uploadingImage && !capturingShot,
              content: (
                <div className="space-y-4 py-1">
                  {/* Live Camera Studio */}
                  {isCameraOpen ? (
                    <div className="rounded-2xl border border-purple-500/40 bg-slate-950/90 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {(['1:1', '4:5', '4:3'] as CaptureRatioKey[]).map((key) => {
                            const cfg = CAPTURE_RATIOS[key];
                            const selected = captureRatio === key;
                            return (
                              <button
                                key={key}
                                type="button"
                                onClick={() => setCaptureRatio(key)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                                  selected
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                                }`}
                              >
                                {cfg.label}
                              </button>
                            );
                          })}
                        </div>
                        <span className="text-[10px] font-mono text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-md border border-purple-500/30">
                          {activeRatio.width}×{activeRatio.height}px
                        </span>
                      </div>

                      <div
                        className={`relative w-full max-w-[300px] mx-auto ${activeRatio.aspectClass} rounded-xl overflow-hidden bg-black border-2 border-purple-400/70 shadow-lg`}
                      >
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        {/* Corner framing guides matching exact product crop */}
                        <div className="pointer-events-none absolute inset-2">
                          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/85 rounded-tl" />
                          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-white/85 rounded-tr" />
                          <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-white/85 rounded-bl" />
                          <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/85 rounded-br" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleSwitchCamera}
                          disabled={cameraLoading || capturingShot}
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <SwitchCamera className="w-4 h-4 text-purple-300" />
                          <span>{lang === 'my' ? 'ကင်မရာလှည့်မည်' : 'Flip'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleCapturePhoto}
                          disabled={capturingShot}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 cursor-pointer disabled:opacity-60"
                        >
                          {capturingShot ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Aperture className="w-4 h-4" />
                          )}
                          <span>
                            {capturingShot
                              ? lang === 'my'
                                ? 'သိမ်းဆည်းနေသည်...'
                                : 'Capturing...'
                              : lang === 'my'
                              ? 'ဓာတ်ပုံရိုက်ပြီး တင်မည်'
                              : 'Capture & Upload'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={stopCameraStream}
                          disabled={capturingShot}
                          className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-xs font-semibold text-rose-200 cursor-pointer"
                        >
                          {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Dual Entry: Live Camera + Gallery Upload */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => startCamera(facingMode)}
                          disabled={cameraLoading || uploadingImage || analyzingImage}
                          className="py-4 px-3.5 rounded-2xl bg-gradient-to-br from-purple-600/25 to-indigo-600/20 hover:from-purple-600/35 hover:to-indigo-600/30 border border-purple-500/45 text-center transition-all cursor-pointer disabled:opacity-50 flex flex-col items-center justify-center gap-1.5"
                        >
                          {cameraLoading ? (
                            <Loader2 className="w-7 h-7 text-purple-300 animate-spin" />
                          ) : (
                            <Camera className="w-7 h-7 text-purple-300" />
                          )}
                          <span className="text-xs font-bold text-white">
                            {cameraLoading
                              ? lang === 'my'
                                ? 'Camera ဖွင့်နေသည်...'
                                : 'Opening Camera...'
                              : lang === 'my'
                              ? 'Live Camera ဖြင့် ရိုက်မည်'
                              : 'Take Live Photo'}
                          </span>
                          <span className="text-[10px] text-purple-200/80 font-mono">
                            {activeRatio.label} ({activeRatio.width}×{activeRatio.height})
                          </span>
                        </button>

                        <label
                          className={`py-4 px-3.5 border-2 border-dashed border-white/15 hover:border-purple-400/60 bg-white/[0.03] hover:bg-white/[0.06] rounded-2xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 ${
                            uploadingImage || analyzingImage ? 'opacity-60 pointer-events-none' : ''
                          }`}
                        >
                          <Upload className="w-7 h-7 text-slate-300" />
                          <span className="text-xs font-semibold text-slate-100">
                            {uploadingImage
                              ? lang === 'my'
                                ? 'ပုံတင်နေပါသည်...'
                                : 'Uploading...'
                              : previewImageSrc
                              ? lang === 'my'
                                ? 'ဖိုင်မှ ပြောင်းတင်မည်'
                                : 'Replace from Files'
                              : lang === 'my'
                              ? 'ဖိုင် / Gallery မှ တင်မည်'
                              : 'Upload from Gallery'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            JPG, PNG, WebP (Max 5MB)
                          </span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {cameraError && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2 text-xs text-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                        <span>{cameraError}</span>
                      </div>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 font-semibold cursor-pointer">
                        <Camera className="w-3.5 h-3.5" />
                        <span>
                          {lang === 'my'
                            ? 'Device Camera ဖြင့် တိုက်ရိုက်ရိုက်တင်မည်'
                            : 'Open Device Camera Capture'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}

                  {previewImageSrc && !isCameraOpen && (
                    <div className="relative group rounded-2xl overflow-hidden border border-white/15 bg-slate-950/60">
                      <img
                        src={previewImageSrc}
                        className="w-full h-48 object-contain bg-slate-950/80"
                        alt="Product preview"
                      />
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        {(hasSelectedFile || formData.imageUrl) && !analyzingImage && (
                          <button
                            type="button"
                            onClick={onReanalyzeImage}
                            className="p-1.5 px-2.5 bg-purple-600/90 hover:bg-purple-500 text-white rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                            title={lang === 'my' ? 'AI ဖြင့် ပြန်လည်ခွဲခြမ်းမည်' : 'Re-analyze with AI'}
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{lang === 'my' ? 'AI ပြန်စစ်မည်' : 'Analyze AI'}</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, imageUrl: '' });
                            setLocalImagePreview?.(null);
                          }}
                          className="p-1.5 px-2.5 bg-rose-600/90 hover:bg-rose-700 text-white rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
                          title={lang === 'my' ? 'ပုံဖျက်မည်' : 'Remove Image'}
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>{lang === 'my' ? 'ဖျက်မည်' : 'Remove'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {analyzingImage && (
                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center gap-3 text-xs text-purple-200">
                      <Loader2 className="w-4 h-4 text-purple-400 animate-spin shrink-0" />
                      <div>
                        <p className="font-semibold">
                          {lang === 'my'
                            ? 'Groq AI (Main) မှ ပုံကို ခွဲခြမ်းစိတ်ဖြာနေပါသည်...'
                            : 'Groq AI (Main) is analyzing your product photo...'}
                        </p>
                        <p className="text-[11px] text-purple-300/80 mt-0.5">
                          {lang === 'my'
                            ? 'အမည်၊ အမျိုးအစား၊ ဖော်ပြချက်နှင့် အရောင်/အရွယ်အစားများကို ကြိုတင်ဖြည့်ပေးနေပါသည်။'
                            : 'Detecting product title, category, description, and variants.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {uploadSuccessMessage && !analyzingImage && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{uploadSuccessMessage}</span>
                    </div>
                  )}

                  {uploadError && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  {aiAnalysisError && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-2 text-xs text-amber-300">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{aiAnalysisError}</span>
                    </div>
                  )}

                  {aiAnalysisApplied && !analyzingImage && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/30 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>
                            {lang === 'my'
                              ? 'AI မှ အချက်အလက်များ ကြိုတင်ဖြည့်ပြီးပါပြီ (နောက်တစ်ဆင့်တွင် ပြင်ဆင်နိုင်သည်)'
                              : 'AI pre-filled your product details (editable in next steps)'}
                          </span>
                        </div>
                        {aiAnalysisMeta && (
                          <span className="text-[10px] font-mono text-emerald-200/90 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30">
                            {aiAnalysisMeta.provider === 'groq' ? 'Groq (Main)' : 'Cloudflare AI'} · {aiAnalysisMeta.model}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                        <div className="bg-slate-950/50 rounded-lg p-2 border border-white/5">
                          <span className="text-slate-500 block">
                            {lang === 'my' ? 'ပစ္စည်းအမည်' : 'Name'}
                          </span>
                          <span className="font-semibold text-white truncate block">{formData.name || '-'}</span>
                        </div>
                        <div className="bg-slate-950/50 rounded-lg p-2 border border-white/5">
                          <span className="text-slate-500 block">
                            {lang === 'my' ? 'ခန့်မှန်းဈေးနှုန်း' : 'Est. Price'}
                          </span>
                          <span className="font-mono font-semibold text-purple-300 block">
                            {Number(formData.price || 0).toLocaleString()} MMK
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ),
            },
            {
              title: lang === 'my' ? 'အချက်အလက် စစ်ဆေးပြင်ဆင်ရန်' : 'Review & Edit Details',
              instruction:
                lang === 'my'
                  ? 'AI မှ ကြိုတင်ဖြည့်ပေးထားသော အချက်အလက်များကို စစ်ဆေးပြီး လိုအပ်သလို ပြင်ဆင်ပါ။'
                  : 'Review the pre-filled details and edit anything you would like to change.',
              canNext: Boolean(formData.name?.trim() && formData.sku?.trim()),
              content: (
                <div className="space-y-3.5 py-1">
                  {aiAnalysisApplied && (
                    <div className="px-3 py-2 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center gap-2 text-[11px] text-purple-200">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      <span>
                        {lang === 'my'
                          ? 'AI မှ ပုံအပေါ်မူတည်၍ ကြိုတင်ဖြည့်ထားပါသည်။ စိတ်ကြိုက်ပြင်ဆင်နိုင်ပါသည်။'
                          : 'Pre-filled by AI from your photo. Feel free to edit any field.'}
                      </span>
                    </div>
                  )}

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                      {lang === 'my' ? 'ကုန်ပစ္စည်းအမည် *' : 'Product Name *'}
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={lang === 'my' ? 'ဥပမာ - ပိုးသား ဂါဝန်ရှည်' : 'e.g. Classic Cotton T-Shirt'}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-all outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                        {lang === 'my' ? 'အမျိုးအစား' : 'Category'}
                      </label>
                      <input
                        type="text"
                        value={formData.category || ''}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder={lang === 'my' ? 'ဥပမာ - Fashion' : 'e.g. Fashion'}
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5 text-xs">SKU *</label>
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                      {lang === 'my' ? 'ဖော်ပြချက်' : 'Description'}
                    </label>
                    <textarea
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder={
                        lang === 'my'
                          ? 'ပစ္စည်းအကြောင်း အသေးစိတ် ဖော်ပြချက်...'
                          : 'Detailed product description...'
                      }
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 transition-all outline-none resize-none"
                    />
                  </div>
                </div>
              ),
            },
            {
              title: lang === 'my' ? 'ဈေးနှုန်း၊ စတော့ နှင့် Save' : 'Price, Variants & Save',
              instruction:
                lang === 'my'
                  ? 'ရောင်းဈေး၊ အရင်းဈေးနှင့် Variants စတော့များကို စစ်ဆေးပြင်ဆင်ပြီး သိမ်းဆည်းပါ။'
                  : 'Verify price, cost, variants, and stock before saving.',
              content: (
                <div className="space-y-4 py-1">
                  {formError && (
                    <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                        {lang === 'my' ? 'ရောင်းဈေး (MMK) *' : 'Price (MMK) *'}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: Number(e.target.value) })
                        }
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                        {lang === 'my' ? 'အရင်းဈေး (MMK)' : 'Cost (MMK)'}
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={formData.costPrice}
                        onChange={(e) =>
                          setFormData({ ...formData, costPrice: e.target.value })
                        }
                        className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1.5 text-xs">
                      {lang === 'my' ? 'ပရိုမိုးရှင်း / Discount (မထည့်လည်းရ)' : 'Discount / Promo Note (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={formData.discount || ''}
                      onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                      placeholder={lang === 'my' ? 'ဥပမာ - 10% OFF' : 'e.g. 10% OFF'}
                      className="w-full bg-white/[0.04] border border-white/10 focus:border-purple-500/80 focus:bg-white/[0.08] focus:ring-4 focus:ring-purple-500/15 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 transition-all outline-none"
                    />
                  </div>

                  {/* Variants & Stock */}
                  <div className="pt-2 border-t border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">
                          {lang === 'my' ? 'အရောင် / အရွယ်အစားနှင့် စတော့' : 'Variants & Stock'}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {lang === 'my'
                            ? `စုစုပေါင်း စတော့: ${totalVariantStock}`
                            : `Total stock: ${totalVariantStock}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddVariantRow}
                        className="px-2.5 py-1.5 bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/35 text-purple-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{lang === 'my' ? 'ထပ်ထည့်မည်' : 'Add Variant'}</span>
                      </button>
                    </div>

                    <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                      {(formData.variants || []).map((v: any, idx: number) => (
                        <div
                          key={idx}
                          className="grid grid-cols-12 gap-2 items-center bg-white/[0.03] border border-white/10 rounded-xl p-2"
                        >
                          <input
                            type="text"
                            value={v.color}
                            onChange={(e) => {
                              const next = [...formData.variants];
                              next[idx] = { ...next[idx], color: e.target.value };
                              setFormData({ ...formData, variants: next });
                            }}
                            placeholder={lang === 'my' ? 'အရောင်' : 'Color'}
                            className="col-span-4 bg-slate-950/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                          />
                          <input
                            type="text"
                            value={v.size}
                            onChange={(e) => {
                              const next = [...formData.variants];
                              next[idx] = { ...next[idx], size: e.target.value };
                              setFormData({ ...formData, variants: next });
                            }}
                            placeholder={lang === 'my' ? 'ဆိုဒ်' : 'Size'}
                            className="col-span-4 bg-slate-950/60 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                          />
                          <input
                            type="number"
                            min={0}
                            value={v.stock}
                            onChange={(e) => {
                              const next = [...formData.variants];
                              next[idx] = { ...next[idx], stock: Number(e.target.value) };
                              setFormData({ ...formData, variants: next });
                            }}
                            placeholder="Qty"
                            className="col-span-3 bg-slate-950/60 border border-white/10 rounded-lg px-2 py-1.5 text-xs font-mono text-white outline-none focus:border-purple-500"
                          />
                          <button
                            type="button"
                            disabled={formData.variants.length <= 1}
                            onClick={() => handleRemoveVariantRow(idx)}
                            className="col-span-1 p-1.5 text-slate-400 hover:text-rose-400 disabled:opacity-30 cursor-pointer flex justify-center"
                            title={lang === 'my' ? 'ဖျက်မည်' : 'Remove'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};
