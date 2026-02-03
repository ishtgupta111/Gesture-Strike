
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { generateGameRule } from './services/geminiService';
import { GameRule, HandPosition } from './types';
import CameraFeed from './components/CameraFeed';
import GameArena from './components/GameArena';
import { soundService } from './services/soundService';
import { 
  Play, 
  RotateCcw, 
  Award, 
  Zap, 
  Trophy, 
  TrendingUp, 
  Info, 
  X, 
  Hand, 
  Target, 
  User,
  Gamepad2,
  Rocket,
  Crown,
  Ghost,
  Cat,
  Flame,
  Skull,
  UserPlus,
  ArrowLeftRight,
  ChevronRight,
  Trash2,
  Home,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';

const PROFILES_KEY = 'gesture_striker_profiles';
const LAST_USER_KEY = 'gesture_striker_last_user';
const DEFAULT_NAME = 'Striker';

interface ProfileData {
  score: number;
  icon: string;
}

interface UserProfiles {
  [name: string]: ProfileData | number;
}

const AVATAR_OPTIONS = [
  { id: 'User', Icon: User },
  { id: 'Gamepad2', Icon: Gamepad2 },
  { id: 'Rocket', Icon: Rocket },
  { id: 'Zap', Icon: Zap },
  { id: 'Target', Icon: Target },
  { id: 'Crown', Icon: Crown },
  { id: 'Ghost', Icon: Ghost },
  { id: 'Cat', Icon: Cat },
  { id: 'Flame', Icon: Flame },
  { id: 'Skull', Icon: Skull },
];

const AdSection: React.FC<{ type: 'horizontal' | 'vertical' | 'mini' }> = ({ type }) => {
  return (
    <div className={`relative overflow-hidden bg-white/5 border border-white/10 rounded-2xl backdrop-blur-sm group transition-all hover:bg-white/10 ${
      type === 'horizontal' ? 'w-full py-4 px-6 flex items-center justify-between gap-4' : 
      type === 'mini' ? 'py-2 px-4 flex items-center gap-3' :
      'w-full p-6 flex flex-col gap-4'
    }`}>
      <div className="absolute top-0 right-0 p-1.5 flex items-center gap-1 opacity-50">
        <span className="text-[8px] font-black uppercase tracking-tighter text-slate-500">Ads by Google</span>
        <Info className="w-2.5 h-2.5 text-slate-500" />
      </div>

      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="text-left">
          <h4 className="text-sm font-black text-white leading-tight">Elite Striker Gear</h4>
          <p className="text-[10px] text-slate-400 font-medium">Upgrade your visual tracking speed by 25% today.</p>
        </div>
      </div>

      <button className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap">
        Learn More
        <ExternalLink className="w-3 h-3" />
      </button>
    </div>
  );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'landing' | 'loading' | 'playing' | 'gameover'>('landing');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [showProfileSelector, setShowProfileSelector] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [rule, setRule] = useState<GameRule | null>(null);
  const [finalScore, setFinalScore] = useState(0);
  const [userName, setUserName] = useState('');
  const [userIcon, setUserIcon] = useState('User');
  const [highScore, setHighScore] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [leftHand, setLeftHand] = useState<HandPosition>({ x: 0.5, y: 0.8, active: false });
  const [rightHand, setRightHand] = useState<HandPosition>({ x: 0.5, y: 0.8, active: false });
  const [availableProfiles, setAvailableProfiles] = useState<{name: string, data: ProfileData}[]>([]);

  const ActiveAvatarIcon = useMemo(() => {
    const option = AVATAR_OPTIONS.find(a => a.id === userIcon);
    return option ? option.Icon : User;
  }, [userIcon]);

  const getAvatarById = (id: string) => {
    const option = AVATAR_OPTIONS.find(a => a.id === id);
    return option ? option.Icon : User;
  };

  // Load profile helper
  const loadProfile = useCallback((name: string) => {
    if (!name.trim()) return;
    const profiles: UserProfiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
    const data = profiles[name];
    if (data) {
      if (typeof data === 'number') {
        setHighScore(data);
        setUserIcon('User');
      } else {
        setHighScore(data.score || 0);
        setUserIcon(data.icon || 'User');
      }
    } else {
      setHighScore(0);
      setUserIcon('User');
    }
  }, []);

  const refreshProfileList = useCallback(() => {
    const raw: UserProfiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
    const list = Object.entries(raw).map(([name, data]) => ({
      name,
      data: typeof data === 'number' ? { score: data, icon: 'User' } : data
    }));
    setAvailableProfiles(list);
  }, []);

  // Initialize data on mount
  useEffect(() => {
    const lastUser = localStorage.getItem(LAST_USER_KEY);
    refreshProfileList();
    if (lastUser) {
      setUserName(lastUser);
      loadProfile(lastUser);
      setIsEditingProfile(false);
    } else {
      setIsEditingProfile(true);
    }
  }, [loadProfile, refreshProfileList]);

  const handleProfileSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const activeName = userName.trim();
    if (activeName) {
      localStorage.setItem(LAST_USER_KEY, activeName);
      loadProfile(activeName);
      setIsEditingProfile(false);
      refreshProfileList();
      soundService.playBlip(false);
    }
  };

  const updateProfileIcon = (iconId: string) => {
    setUserIcon(iconId);
    const activeName = userName.trim();
    if (activeName) {
      const profiles: UserProfiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
      const currentData = profiles[activeName];
      const existingScore = typeof currentData === 'number' ? currentData : (currentData?.score || 0);
      
      profiles[activeName] = {
        score: existingScore,
        icon: iconId
      };
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      refreshProfileList();
    }
    soundService.playBlip(false);
  };

  const selectProfile = (name: string) => {
    setUserName(name);
    loadProfile(name);
    localStorage.setItem(LAST_USER_KEY, name);
    setShowProfileSelector(false);
    setIsEditingProfile(false);
    soundService.playBlip(false);
  };

  const deleteProfile = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const profiles: UserProfiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
    delete profiles[name];
    localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    refreshProfileList();
    
    if (userName === name) {
      setUserName('');
      setUserIcon('User');
      setHighScore(0);
      setIsEditingProfile(true);
      localStorage.removeItem(LAST_USER_KEY);
    }
    soundService.playBlip(true);
  };

  const startGame = async () => {
    const activeName = userName.trim() || DEFAULT_NAME;
    loadProfile(activeName);
    setIsNewRecord(false);
    setGameState('loading');
    
    try {
      const newRule = await generateGameRule();
      setRule(newRule);
      soundService.playStart();
      setGameState('playing');
    } catch (error) {
      console.error("Game start failed:", error);
      setGameState('landing');
    }
  };

  const handleHandsUpdate = useCallback((left: HandPosition, right: HandPosition) => {
    setLeftHand(left);
    setRightHand(right);
  }, []);

  const handleGameOver = (score: number) => {
    const activeName = userName.trim() || DEFAULT_NAME;
    setFinalScore(score);
    soundService.playGameOver();
    
    const profiles: UserProfiles = JSON.parse(localStorage.getItem(PROFILES_KEY) || '{}');
    const currentData = profiles[activeName];
    const currentBest = typeof currentData === 'number' ? currentData : (currentData?.score || 0);
    const currentIcon = typeof currentData === 'object' ? currentData.icon : userIcon;
    
    if (score > currentBest) {
      setHighScore(score);
      setIsNewRecord(true);
      profiles[activeName] = { score, icon: currentIcon || 'User' };
      localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
    } else {
      setIsNewRecord(false);
      if (!profiles[activeName]) {
        profiles[activeName] = { score: currentBest, icon: currentIcon || 'User' };
        localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
      }
    }
    refreshProfileList();
    setGameState('gameover');
  };

  const toggleInstructions = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    soundService.playBlip(!isInstructionsOpen);
    setIsInstructionsOpen(!isInstructionsOpen);
  };

  const switchToNewProfile = () => {
    setUserName('');
    setUserIcon('User');
    setHighScore(0);
    setIsEditingProfile(true);
    setShowProfileSelector(false);
    soundService.playBlip(true);
  };

  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col relative overflow-hidden" onClick={() => soundService.playBlip(false)}>
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600 rounded-full blur-[120px]" />
      </div>

      {gameState === 'landing' && (
        <div className="flex-1 flex flex-col items-center justify-center z-10 p-6 text-center overflow-y-auto custom-scrollbar">
          <div className="mb-8 p-10 bg-white/5 rounded-[3rem] backdrop-blur-2xl border border-white/10 shadow-2xl relative w-full max-w-xl animate-in fade-in zoom-in duration-500">
            
            <h1 className="text-5xl font-black mb-10 tracking-tighter bg-gradient-to-r from-blue-400 via-indigo-400 to-rose-400 bg-clip-text text-transparent">
              GESTURE STRIKER AI
            </h1>

            {isEditingProfile ? (
              /* Striker Setup Form */
              <form onSubmit={handleProfileSubmit} className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                <div className="text-left">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 px-1">
                    Enter Striker Name
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none group-focus-within:text-blue-400 transition-colors">
                      <UserPlus className="w-5 h-5" />
                    </div>
                    <input 
                      autoFocus
                      type="text"
                      maxLength={12}
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="w-full bg-slate-950/50 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold text-lg placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-inner"
                      placeholder="e.g. Maverick"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>

                <div className="text-left">
                  <label className="block text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-3 px-1">
                    Choose Your Avatar
                  </label>
                  <div className="grid grid-cols-5 gap-3 p-3 bg-slate-950/50 border border-white/10 rounded-2xl shadow-inner">
                    {AVATAR_OPTIONS.map(({ id, Icon }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateProfileIcon(id);
                        }}
                        className={`p-2.5 rounded-xl transition-all flex items-center justify-center ${
                          userIcon === id 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 scale-110' 
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  {availableProfiles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 rounded-2xl transition-all active:scale-95 border border-white/5"
                    >
                      CANCEL
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!userName.trim()}
                    className="flex-[2] bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-blue-900/20 active:scale-95"
                  >
                    SAVE PROFILE
                  </button>
                </div>
              </form>
            ) : (
              /* Active Profile Card */
              <div className="space-y-8 animate-in slide-in-from-top-4 duration-500">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-rose-500 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200 animate-pulse"></div>
                  <div className="relative bg-slate-900/80 rounded-[2rem] p-8 border border-white/10 flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-blue-500/50 flex items-center justify-center text-white shadow-2xl">
                      <ActiveAvatarIcon className="w-10 h-10" />
                    </div>
                    <div className="text-left flex-1">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mb-1">Active Striker</p>
                      <h2 className="text-3xl font-black text-white tracking-tight">{userName}</h2>
                      <div className="flex items-center gap-2 mt-2 text-yellow-500">
                        <Trophy className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Personal Best: {highScore}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowProfileSelector(true);
                      }}
                      className="p-3 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white transition-all border border-blue-500/20 shadow-lg"
                      title="Switch Striker"
                    >
                      <ArrowLeftRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startGame();
                    }}
                    className="group relative inline-flex items-center justify-center gap-4 bg-white text-slate-950 px-8 py-5 rounded-[1.5rem] font-black text-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.25)]"
                  >
                    <Play className="w-7 h-7 fill-current" />
                    START MISSION
                  </button>
                  <div className="flex gap-4">
                    <button
                      onClick={toggleInstructions}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-800/50 text-white px-6 py-4 rounded-2xl font-bold border border-white/10 transition-all hover:bg-slate-700 active:scale-95"
                    >
                      <Info className="w-5 h-5" />
                      HOW TO PLAY
                    </button>
                    <button
                      onClick={switchToNewProfile}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-slate-800/50 text-white px-6 py-4 rounded-2xl font-bold border border-white/10 transition-all hover:bg-slate-700 active:scale-95"
                    >
                      <UserPlus className="w-5 h-5" />
                      NEW STRIKER
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 pt-8 border-t border-white/5">
              <AdSection type="horizontal" />
            </div>
          </div>
        </div>
      )}

      {/* Profile Selector Modal */}
      {showProfileSelector && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/70 backdrop-blur-xl animate-in fade-in duration-300" onClick={() => setShowProfileSelector(false)}>
          <div className="bg-slate-900 border border-white/10 rounded-[3rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in duration-300" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b border-white/5 bg-slate-950/50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-black text-white">Select Striker</h3>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Found {availableProfiles.length} Profiles</p>
              </div>
              <button onClick={() => setShowProfileSelector(false)} className="p-2 rounded-full hover:bg-white/5 transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="max-h-[50vh] overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {availableProfiles.length === 0 ? (
                <div className="py-12 text-center">
                  <Ghost className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-20" />
                  <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No saved strikers found</p>
                </div>
              ) : (
                availableProfiles.map(({ name, data }) => {
                  const ProfileIcon = getAvatarById(data.icon);
                  const isActive = name === userName;
                  return (
                    <button
                      key={name}
                      onClick={() => selectProfile(name)}
                      className={`w-full text-left group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 ${
                        isActive 
                          ? 'bg-blue-600 border-blue-400 shadow-lg shadow-blue-900/20' 
                          : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400 group-hover:text-blue-400'
                      }`}>
                        <ProfileIcon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-black text-lg leading-tight ${isActive ? 'text-white' : 'text-slate-300'}`}>{name}</h4>
                        <div className={`flex items-center gap-1.5 mt-0.5 ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>
                          <Trophy className="w-3 h-3" />
                          <span className="text-[10px] font-bold uppercase tracking-tighter">Best: {data.score}</span>
                        </div>
                      </div>
                      {isActive ? (
                        <div className="bg-white/20 px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest">Active</div>
                      ) : (
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={(e) => deleteProfile(name, e)}
                                className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white transition-all"
                                title="Delete Profile"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                            <ChevronRight className="w-6 h-6 text-slate-600" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-slate-950/30">
              <button
                onClick={switchToNewProfile}
                className="w-full flex items-center justify-center gap-3 bg-white/10 hover:bg-white/20 text-white font-black py-4 rounded-2xl border border-white/10 transition-all active:scale-95"
              >
                <UserPlus className="w-5 h-5" />
                CREATE NEW STRIKER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {isInstructionsOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-8 sm:p-12 relative">
              <button onClick={toggleInstructions} className="absolute top-8 right-8 p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
              <h2 className="text-3xl font-black mb-8 text-white flex items-center gap-4">
                <Info className="w-8 h-8 text-blue-400" />
                Striker Briefing
              </h2>
              <div className="space-y-8 text-left">
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                    <Hand className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">The Controls</h3>
                    <p className="text-slate-400 leading-relaxed">
                      Your camera detects your <span className="text-blue-400 font-bold uppercase">Left</span> and <span className="text-rose-400 font-bold uppercase">Right</span> hands. Use them to move the sticks and strike objects.
                    </p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-green-500/20 flex items-center justify-center border border-green-500/30">
                    <Target className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2">The Mission</h3>
                    <p className="text-slate-400 leading-relaxed">Gemini AI generates unique rules for every game. Hit the TARGET emoji to score, but avoid the OBSTACLE at all costs.</p>
                  </div>
                </div>
              </div>
              <div className="mt-12 pt-8 border-t border-white/5">
                <button onClick={toggleInstructions} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-900/20">
                  LOCKED AND LOADED
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center z-10">
          <div className="relative w-24 h-24 mb-8">
            <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
            <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
          </div>
          <p className="text-2xl font-black animate-pulse text-blue-400 tracking-tight uppercase">MISSION GENERATING...</p>
          <div className="mt-4 flex items-center gap-2 px-6 py-2 bg-white/5 border border-white/10 rounded-full">
            <ActiveAvatarIcon className="w-4 h-4 text-blue-400" />
            <span className="text-slate-400 font-bold text-sm uppercase">{userName}</span>
            <span className="text-slate-600 px-2">|</span>
            <Trophy className="w-4 h-4 text-yellow-500" />
            <span className="text-yellow-500 font-bold text-sm">{highScore}</span>
          </div>
        </div>
      )}

      {gameState === 'playing' && rule && (
        <GameArena 
          rule={rule} 
          leftHand={leftHand} 
          rightHand={rightHand} 
          onGameOver={handleGameOver}
        />
      )}

      {gameState === 'gameover' && (
        <div className="flex-1 flex flex-col items-center justify-center z-10 p-6 overflow-y-auto custom-scrollbar">
          <div className="bg-slate-900/80 backdrop-blur-2xl p-12 rounded-[3.5rem] border border-white/10 shadow-2xl text-center max-w-sm w-full relative transform animate-in fade-in slide-in-from-bottom-10 duration-700">
            {isNewRecord && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-orange-500 px-8 py-3 rounded-full shadow-2xl animate-bounce z-20 whitespace-nowrap">
                <span className="text-sm font-black text-slate-950 uppercase tracking-widest flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> ALL-TIME BEST!
                </span>
              </div>
            )}
            
            <div className="w-24 h-24 mx-auto mb-6 bg-slate-800 rounded-full flex items-center justify-center text-rose-500 border-2 border-white/10 shadow-2xl">
              <ActiveAvatarIcon className="w-12 h-12" />
            </div>

            <h2 className="text-4xl font-black mb-2 animate-text-glow uppercase">MISSION OVER</h2>
            <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mb-6">Striker: {userName}</p>
            
            <div className="my-10 flex flex-col gap-8">
              <div className="animate-soft-scale">
                <span className="block text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">Final Score</span>
                <span className="text-8xl font-black text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]">{finalScore}</span>
              </div>
              
              <div className="flex items-center justify-center gap-3 py-3 px-6 bg-white/5 rounded-2xl border border-white/5 mx-auto animate-gentle-float">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="text-slate-400 text-sm font-bold uppercase tracking-wider">Record:</span>
                <span className="text-yellow-500 text-xl font-black">{highScore}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={(e) => {
                    e.stopPropagation();
                    startGame();
                }}
                className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white px-8 py-5 rounded-2xl font-black text-xl transition-all hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-xl shadow-blue-900/40"
              >
                <RotateCcw className="w-6 h-6" />
                RE-STRIKE
              </button>
              <button
                onClick={() => setGameState('landing')}
                className="w-full flex items-center justify-center gap-3 bg-slate-800/50 text-white px-8 py-4 rounded-2xl font-bold border border-white/10 transition-all hover:bg-slate-700 active:scale-95 shadow-lg"
              >
                <Home className="w-5 h-5 text-blue-400" />
                BACK TO MENU
              </button>
            </div>

            <div className="mt-8">
              <AdSection type="vertical" />
            </div>
          </div>
        </div>
      )}

      {gameState !== 'landing' && <CameraFeed onHandsDetected={handleHandsUpdate} />}
    </div>
  );
};

export default App;
