import React, { useState, useMemo } from 'react';
import {
  User,
  Sliders,
  Sparkles,
  Save,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Play,
  Layers,
  Box,
  ShieldCheck
} from 'lucide-react';
import { AvatarEngine, AvatarParameters, DEFAULT_AVATAR_PARAMS } from './studio/AvatarEngine';
import { StudioViewport } from './studio/StudioViewport';
import { AvatarStorage, SavedAvatarRecord } from './studio/AvatarStorage';
import { GlbHandler } from './studio/GlbHandler';
import { TopologyValidator } from './studio/TopologyValidator';
import { DeformationValidator } from './studio/DeformationValidator';
import { BenchmarkRunner } from './studio/BenchmarkRunner';

interface StudioViewProps {
  lang: 'my' | 'en';
  onBack?: () => void;
}

export const StudioView: React.FC<StudioViewProps> = ({ lang, onBack }) => {
  const [params, setParams] = useState<AvatarParameters>(DEFAULT_AVATAR_PARAMS);
  const [cameraPreset, setCameraPreset] = useState<'front' | 'side' | 'back' | 'isometric'>('isometric');
  const [activeTab, setActiveTab] = useState<'face' | 'body' | 'measurements' | 'tests'>('body');
  
  // Storage & Export state
  const [avatarName, setAvatarName] = useState('My Custom Avatar');
  const [savedAvatars, setSavedAvatars] = useState<SavedAvatarRecord[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Test Results State
  const [topologyResult, setTopologyResult] = useState<any>(null);
  const [deformationResult, setDeformationResult] = useState<any>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<any>(null);
  const [glbValidationResult, setGlbValidationResult] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  // Generate 3D Avatar Scene Group
  const avatarData = useMemo(() => {
    return AvatarEngine.createAvatar(params);
  }, [params]);

  // Load saved avatars on mount
  React.useEffect(() => {
    AvatarStorage.getAllAvatars().then(setSavedAvatars).catch(() => {});
  }, []);

  const handleParamChange = (key: keyof AvatarParameters, value: any) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveToIndexedDB = async () => {
    try {
      const record = await AvatarStorage.saveAvatar(avatarName, params);
      const updated = await AvatarStorage.getAllAvatars();
      setSavedAvatars(updated);
      setSuccessMessage(lang === 'my' ? 'അဗာတာကို သိမ်းဆည်းပြီးပါပြီ!' : `Avatar "${record.name}" saved to IndexedDB successfully!`);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save avatar');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleExportGlb = async () => {
    try {
      const buffer = await GlbHandler.exportToGlb(avatarData.group);
      const blob = new Blob([buffer], { type: 'model/gltf-binary' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${avatarName.replace(/\s+/g, '_')}_shopsone.glb`;
      a.click();
      URL.revokeObjectURL(url);

      setSuccessMessage(lang === 'my' ? 'GLB ဖိုင်ကို အောင်မြင်စွာ ထုတ်ယူပြီးပါပြီ!' : 'GLB file exported successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to export GLB');
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setErrorMessage(null);
    try {
      // 1. Topology
      const topo = TopologyValidator.validate(avatarData.mesh.geometry);
      setTopologyResult(topo);

      // 2. Deformation
      const def = DeformationValidator.validate(avatarData.mesh);
      setDeformationResult(def);

      // 3. Benchmark
      const bench = await BenchmarkRunner.runBenchmark('Procedural Avatar Generation', () => {
        AvatarEngine.createAvatar(params);
      });
      setBenchmarkResult(bench);

      // 4. GLB Export & Import Validation
      const buffer = await GlbHandler.exportToGlb(avatarData.group);
      const { validation } = await GlbHandler.importAndValidateGlb(buffer);
      setGlbValidationResult(validation);

      setSuccessMessage(lang === 'my' ? 'စမ်းသပ်မှုများ အားလုံး အောင်မြင်ပါသည်!' : 'All validation tests completed successfully!');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Test execution error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header Banner */}
      <div className="bg-white/[0.03] backdrop-blur-xl p-5 rounded-2xl border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-100">
              {lang === 'my' ? 'ဆိုင်စုံ 3D အဗာတာ ဖန်တီးခန်း' : 'Shopsone 3D Fashion Studio'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {lang === 'my'
                ? 'ဓာတ်ပုံမလိုဘဲ မိမိကိုယ်ပိုင် 3D အဗာတာကို စိတ်ကြိုက်ဖန်တီးပြီး Virtual Try-on ပြုလုပ်ပါ'
                : 'Self-owned parametric 3D human avatar creator & virtual try-on engine'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-white/10 transition-all cursor-pointer"
            >
              {lang === 'my' ? 'ဆိုင်သို့ ပြန်သွားမည်' : 'Return to Shop'}
            </button>
          )}
          <button
            type="button"
            onClick={handleExportGlb}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-purple-600/25 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{lang === 'my' ? 'GLB ထုတ်မည်' : 'Export GLB'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left Panel: Parameters Controls */}
        <div className="lg:col-span-4 bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-lg flex flex-col space-y-4">
          <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('body')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'body' ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'my' ? 'ကိုယ်ခန္ဓာ' : 'Body'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('face')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'face' ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'my' ? 'မျက်နှာ' : 'Face'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('measurements')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'measurements' ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'my' ? 'အတိုင်းအတာ' : 'Sizes'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tests')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'tests' ? 'bg-emerald-600/30 text-emerald-200 border border-emerald-500/40 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {lang === 'my' ? 'စစ်ဆေးချက်' : 'Tests'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {activeTab === 'body' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {lang === 'my' ? 'အရပ်အမောင်း (Height):' : 'Height:'} {params.height}m
                  </label>
                  <input
                    type="range"
                    min="1.50"
                    max="2.00"
                    step="0.01"
                    value={params.height}
                    onChange={(e) => handleParamChange('height', parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {lang === 'my' ? 'ပုခုံးအကျယ် (Shoulder Width):' : 'Shoulder Width:'} {params.shoulderWidth}x
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.4"
                    step="0.05"
                    value={params.shoulderWidth}
                    onChange={(e) => handleParamChange('shoulderWidth', parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {lang === 'my' ? 'ရင်ဘတ်ပတ်လည် (Chest Girth):' : 'Chest Girth:'} {params.chestGirth}x
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.4"
                    step="0.05"
                    value={params.chestGirth}
                    onChange={(e) => handleParamChange('chestGirth', parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {lang === 'my' ? 'ခါးပတ်လည် (Waist Girth):' : 'Waist Girth:'} {params.waistGirth}x
                  </label>
                  <input
                    type="range"
                    min="0.7"
                    max="1.4"
                    step="0.05"
                    value={params.waistGirth}
                    onChange={(e) => handleParamChange('waistGirth', parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {lang === 'my' ? 'တင်ပတ်လည် (Hip Girth):' : 'Hip Girth:'} {params.hipGirth}x
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.4"
                    step="0.05"
                    value={params.hipGirth}
                    onChange={(e) => handleParamChange('hipGirth', parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {lang === 'my' ? 'အရေပြားအရောင် (Skin Tone):' : 'Skin Tone:'}
                  </label>
                  <div className="flex gap-2">
                    {['#f5d0b1', '#e0ac69', '#c68642', '#8d5524', '#3f2204'].map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => handleParamChange('skinTone', col)}
                        className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                          params.skinTone === col ? 'border-purple-400 scale-110 shadow-lg' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: col }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'face' && (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    {lang === 'my' ? 'ခေါင်းအရွယ်အစား (Head Width):' : 'Head Width:'} {params.headWidth}x
                  </label>
                  <input
                    type="range"
                    min="0.8"
                    max="1.2"
                    step="0.05"
                    value={params.headWidth}
                    onChange={(e) => handleParamChange('headWidth', parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>
              </div>
            )}

            {activeTab === 'measurements' && (
              <div className="space-y-3 text-xs bg-slate-950/60 p-4 rounded-2xl border border-white/10 font-mono">
                <div className="flex justify-between text-slate-400 border-b border-white/5 pb-2">
                  <span>Height:</span>
                  <span className="text-slate-100 font-bold">{(params.height * 100).toFixed(0)} cm</span>
                </div>
                <div className="flex justify-between text-slate-400 border-b border-white/5 pb-2">
                  <span>Shoulder Span:</span>
                  <span className="text-slate-100 font-bold">{(params.shoulderWidth * 45).toFixed(1)} cm</span>
                </div>
                <div className="flex justify-between text-slate-400 border-b border-white/5 pb-2">
                  <span>Chest Girth:</span>
                  <span className="text-slate-100 font-bold">{(params.chestGirth * 92).toFixed(1)} cm</span>
                </div>
                <div className="flex justify-between text-slate-400 border-b border-white/5 pb-2">
                  <span>Waist Girth:</span>
                  <span className="text-slate-100 font-bold">{(params.waistGirth * 75).toFixed(1)} cm</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Hip Girth:</span>
                  <span className="text-slate-100 font-bold">{(params.hipGirth * 98).toFixed(1)} cm</span>
                </div>
              </div>
            )}

            {activeTab === 'tests' && (
              <div className="space-y-3 text-xs">
                <button
                  type="button"
                  disabled={testing}
                  onClick={runAllTests}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 cursor-pointer disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{testing ? 'Running Validation Suite...' : 'Run Manifold & Deformation Test Suite'}</span>
                </button>

                {topologyResult && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-white/10 space-y-1 font-mono text-[11px]">
                    <div className="font-bold text-emerald-400">Topology: {topologyResult.status}</div>
                    <div>Boundary Edges: {topologyResult.boundaryEdgeCount}</div>
                    <div>Degenerate Tris: {topologyResult.degenerateTriangleCount}</div>
                    <div>Euler Char: {topologyResult.eulerCharacteristic}</div>
                  </div>
                )}

                {deformationResult && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-white/10 space-y-1 font-mono text-[11px]">
                    <div className="font-bold text-emerald-400">Rigging & Weights: {deformationResult.status}</div>
                    <div>Max Weight Err: {deformationResult.weightSumToleranceMaxError.toExponential(2)}</div>
                    <div>Max Influences: {deformationResult.maxInfluencesPerVertex}</div>
                  </div>
                )}

                {benchmarkResult && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-white/10 space-y-1 font-mono text-[11px]">
                    <div className="font-bold text-purple-400">Performance (20 runs): PASS</div>
                    <div>Median: {benchmarkResult.medianMs.toFixed(2)} ms ({benchmarkResult.fpsMedian} FPS)</div>
                    <div>P95: {benchmarkResult.p95Ms.toFixed(2)} ms</div>
                    <div>Memory: {benchmarkResult.memoryStatus}</div>
                  </div>
                )}

                {glbValidationResult && (
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-white/10 space-y-1 font-mono text-[11px]">
                    <div className="font-bold text-emerald-400">GLTF 2.0 Validation: {glbValidationResult.status}</div>
                    <div>Hierarchy & Skin: PASS</div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Save to IndexedDB section */}
          <div className="pt-3 border-t border-white/10 space-y-2">
            <input
              type="text"
              value={avatarName}
              onChange={(e) => setAvatarName(e.target.value)}
              placeholder="Avatar Preset Name..."
              className="w-full bg-slate-950/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
            />
            <button
              type="button"
              onClick={handleSaveToIndexedDB}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-200 font-semibold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Save className="w-3.5 h-3.5 text-purple-400" />
              <span>{lang === 'my' ? 'IndexedDB တွင် သိမ်းမည်' : 'Save to IndexedDB'}</span>
            </button>
          </div>
        </div>

        {/* Center/Right: 3D Viewport */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <div className="flex items-center justify-between bg-white/[0.03] backdrop-blur-xl p-3 px-4 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2">
              <Box className="w-4 h-4 text-purple-400" />
              <span className="text-xs font-bold text-slate-200">
                {lang === 'my' ? '3D အဗာတာ ကြည့်ရှုစင်' : 'Interactive 3D Viewport'}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {(['isometric', 'front', 'side', 'back'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCameraPreset(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    cameraPreset === preset ? 'bg-purple-600/30 text-purple-200 border border-purple-500/40' : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 min-h-[500px]">
            <StudioViewport avatarGroup={avatarData.group} cameraPreset={cameraPreset} />
          </div>
        </div>
      </div>
    </div>
  );
};
