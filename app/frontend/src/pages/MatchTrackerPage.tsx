import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

type MatchResult = 'Win' | 'Lose';
type Role = 'DPS' | 'Support' | 'Tank';
type SortKey = 'date' | 'result' | 'queue' | 'role';
type SortDirection = 'asc' | 'desc';
type SortState = {
  key: SortKey;
  direction: SortDirection;
};

type ToastMessage = {
  id: string;
  message: string;
};

type PlayerEntry = {
  id: string;
  name: string;
  role: Role;
  character?: string;
};

type MatchEntry = {
  id: string;
  queue: string;
  result: MatchResult;
  rank?: string;
  map?: string;
  score?: number;
  players: PlayerEntry[];
  createdAt: string;
};

type ImprovementTicket = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  completed: boolean;
  completedAt?: string | null;
};

type ImprovementDraft = {
  title: string;
  description: string;
};

type MatchFilters = {
  queue: 'Alle' | 'Rangliste' | 'Stadion';
  result: 'Alle' | MatchResult;
  role: 'Alle' | Role;
  search: string;
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const PLAYER_NAMES = ['Pudel', 'Nora', 'Philipp'];

const COMPETITIVE_TIERS = [
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'Master',
  'Grandmaster',
  'Champion',
];
const COMPETITIVE_DIVISIONS = [5, 4, 3, 2, 1];
const COMPETITIVE_RANKS = COMPETITIVE_TIERS.flatMap((tier) =>
  COMPETITIVE_DIVISIONS.map((division) => `${tier} ${division}`),
);

const STADIUM_RANKS = [
  'Rookie',
  'Novice',
  'Anwärter',
  'Elite',
  'Pro',
  'All-Star',
  'Legende',
  'Herausforderer',
];

const STADIUM_RANK_ICONS: Record<string, string> = {
  'Rookie': '🥉',
  'Novice': '🎖️',
  'Anwärter': '⭐',
  'Elite': '💎',
  'Pro': '🏆',
  'All-Star': '⚡',
  'Legende': '👑',
  'Herausforderer': '🔥',
};

const RANK_OPTIONS: Record<string, string[]> = {
  Rangliste: COMPETITIVE_RANKS,
  Stadion: STADIUM_RANKS,
};

const ROLE_CHARACTERS: Record<Role, string[]> = {
  DPS: [
    'Ashe',
    'Bastion',
    'Cassidy',
    'Echo',
    'Freya',
    'Genji',
    'Hanzo',
    'Junkrat',
    'Mei',
    'Pharah',
    'Reaper',
    'Sojourn',
    'Soldier: 76',
    'Sombra',
    'Symmetra',
    'Torbjörn',
    'Tracer',
    'Venture',
    'Widowmaker',
  ],
  Support: [
    'Ana',
    'Baptiste',
    'Brigitte',
    'Illari',
    'Juno',
    'Kiriko',
    'Lifeweaver',
    'Lúcio',
    'Mercy',
    'Moira',
    'Wuyang',
    'Zenyatta',
  ],
  Tank: [
    'D.Va',
    'Doomfist',
    'Junker Queen',
    'Mauga',
    'Orisa',
    'Ramattra',
    'Reinhardt',
    'Roadhog',
    'Sigma',
    'Winston',
    'Wrecking Ball',
    'Zarya',
  ],
};

const ROLE_LABELS: Record<Role, string> = {
  Tank: '🛡️ Tank',
  DPS: '⚔️ DPS',
  Support: '✚ Support',
};

const ROLE_CLASSES: Record<Role, string> = {
  Tank: 'role-tank',
  DPS: 'role-dps',
  Support: 'role-support',
};

const formatRoleLabel = (role: Role | '-') =>
  role === '-' ? '-' : ROLE_LABELS[role];

const getRoleClass = (role: Role | '-') =>
  role === '-' ? 'role-label' : `role-label ${ROLE_CLASSES[role]}`;

const getAvailablePlayerName = (usedNames: string[]) =>
  PLAYER_NAMES.find((name) => !usedNames.includes(name)) ?? PLAYER_NAMES[0];

const createPlayer = (id: string, usedNames: string[] = []): PlayerEntry => ({
  id,
  name: getAvailablePlayerName(usedNames),
  role: 'DPS',
});

const createMatch = (): MatchEntry => ({
  id: generateId(),
  queue: 'Stadion',
  result: 'Win',
  rank: '',
  map: '',
  players: [createPlayer(generateId())],
  createdAt: new Date().toISOString(),
});

export default function MatchTrackerPage() {
  const [matches, setMatches] = useState<MatchEntry[]>([]);
  const [draft, setDraft] = useState<MatchEntry>(() => createMatch());
  const [roleFilter, setRoleFilter] = useState<'Alle' | Role>('Alle');
  const [submitLocked, setSubmitLocked] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [importing, setImporting] = useState(false);
  const [ultimateUnlocked, setUltimateUnlocked] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchEntry | null>(null);
  const [showAllMatches, setShowAllMatches] = useState(false);
  const [matchesPage, setMatchesPage] = useState(1);
  const [matchesFilters, setMatchesFilters] = useState<MatchFilters>({
    queue: 'Alle',
    result: 'Alle',
    role: 'Alle',
    search: '',
  });
  const [improvements, setImprovements] = useState<ImprovementTicket[]>([]);
  const [improvementsLoading, setImprovementsLoading] = useState(false);
  const [improvementsSubmitting, setImprovementsSubmitting] = useState(false);
  const [improvementDraft, setImprovementDraft] = useState<ImprovementDraft>({
    title: '',
    description: '',
  });
  
  const [playerSort, setPlayerSort] = useState<Record<string, SortState>>(() =>
    Object.fromEntries(
      PLAYER_NAMES.map((name) => [name, { key: 'date', direction: 'desc' }]),
    ),
  );
  const [playerPage, setPlayerPage] = useState<Record<string, number>>(() =>
    Object.fromEntries(PLAYER_NAMES.map((name) => [name, 1])),
  );
  const playerPageSize = 5;

  const addToast = useCallback((message: string) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3500);
  }, []);

  const resetDraft = (previous: MatchEntry): MatchEntry => ({
    ...createMatch(),
    players: previous.players.map((player) => ({
      ...player,
      character: '',
    })),
  });

  const roleFilteredMatches = useMemo(() => {
    if (roleFilter === 'Alle') return matches;
    return matches.filter((match) =>
      match.players.some((player) => player.role === roleFilter),
    );
  }, [matches, roleFilter]);

  const sortedMatches = useMemo(() => {
    return [...matches].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const search = matchesFilters.search.trim().toLowerCase();
    return sortedMatches.filter((match) => {
      if (matchesFilters.queue !== 'Alle' && match.queue !== matchesFilters.queue) {
        return false;
      }
      if (matchesFilters.result !== 'Alle' && match.result !== matchesFilters.result) {
        return false;
      }
      if (
        matchesFilters.role !== 'Alle' &&
        !match.players.some((player) => player.role === matchesFilters.role)
      ) {
        return false;
      }
      if (!search) return true;
      const haystack = [
        match.queue,
        match.rank,
        match.map,
        match.result,
        ...match.players.map((player) => player.name),
        ...match.players.map((player) => player.character ?? ''),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [matchesFilters, sortedMatches]);

  const matchesPageSize = 10;
  const totalMatchPages = Math.max(1, Math.ceil(filteredMatches.length / matchesPageSize));
  const activeMatchPage = Math.min(matchesPage, totalMatchPages);
  const paginatedMatches = useMemo(() => {
    const start = (activeMatchPage - 1) * matchesPageSize;
    return filteredMatches.slice(start, start + matchesPageSize);
  }, [activeMatchPage, filteredMatches]);

  const latestMatches = useMemo(() => sortedMatches.slice(0, 5), [sortedMatches]);

  const loadMatches = useCallback(async () => {
    try {
      const response = await fetch('/api/matches');
      if (response.status === 204 || response.status === 404) {
        setMatches([]);
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to load matches');
      }
      const text = await response.text();
      if (!text) {
        setMatches([]);
        return;
      }
      const data = JSON.parse(text) as MatchEntry[];
      setMatches(Array.isArray(data) ? data : []);
    } catch {
      setMatches([]);
    }
  }, [addToast]);

  useEffect(() => {
    void loadMatches();
  }, [loadMatches]);

  const loadImprovements = useCallback(async () => {
    setImprovementsLoading(true);
    try {
      const response = await fetch('/api/improvements');
      if (!response.ok) {
        throw new Error('Failed to load improvements');
      }
      const data = (await response.json()) as ImprovementTicket[];
      setImprovements(Array.isArray(data) ? data : []);
    } catch {
      setImprovements([]);
    } finally {
      setImprovementsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadImprovements();
  }, [loadImprovements]);

  

  useEffect(() => {
    if (ultimateUnlocked) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'q') {
        setUltimateUnlocked(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [ultimateUnlocked]);

  useEffect(() => {
    if (!selectedMatch) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedMatch(null);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [selectedMatch]);

  useEffect(() => {
    if (!showAllMatches) return;
    setMatchesPage(1);
  }, [matchesFilters, showAllMatches]);

  const winRate = useMemo(() => {
    if (roleFilteredMatches.length === 0) return 0;
    const wins = roleFilteredMatches.filter((match) => match.result === 'Win').length;
    return Math.round((wins / roleFilteredMatches.length) * 100);
  }, [roleFilteredMatches]);

  const winCount = useMemo(
    () => roleFilteredMatches.filter((match) => match.result === 'Win').length,
    [roleFilteredMatches],
  );

  const lossCount = useMemo(
    () => roleFilteredMatches.filter((match) => match.result === 'Lose').length,
    [roleFilteredMatches],
  );

  const playerStats = useMemo(() => {
    return PLAYER_NAMES.map((name) => {
      const playerMatches = roleFilteredMatches.filter((match) =>
        match.players.some(
          (player) =>
            player.name === name &&
            (roleFilter === 'Alle' || player.role === roleFilter),
        ),
      );
      const wins = playerMatches.filter((match) => match.result === 'Win').length;
      const losses = playerMatches.filter((match) => match.result === 'Lose').length;
      const total = playerMatches.length;
      const rate = total === 0 ? 0 : Math.round((wins / total) * 100);
      const roleCounts = new Map<Role, number>();
      const roleWins = new Map<Role, number>();
      const characterCounts = new Map<string, { total: number; wins: number; role: Role }>();

      // Highscore aus Stadion-Matches berechnen
      const stadiumScores = playerMatches
        .filter((match) => match.queue === 'Stadion' && typeof match.score === 'number')
        .map((match) => match.score as number);
      const highscore = stadiumScores.length > 0 ? Math.max(...stadiumScores) : null;

      playerMatches.forEach((match) => {
        const entry = match.players.find((player) => player.name === name);
        if (!entry) return;
        roleCounts.set(entry.role, (roleCounts.get(entry.role) ?? 0) + 1);
        if (match.result === 'Win') {
          roleWins.set(entry.role, (roleWins.get(entry.role) ?? 0) + 1);
        }
        if (entry.character) {
          const current = characterCounts.get(entry.character) ?? { total: 0, wins: 0, role: entry.role };
          current.total += 1;
          if (match.result === 'Win') current.wins += 1;
          characterCounts.set(entry.character, current);
        }
      });

      // Winrate pro Rolle berechnen
      const roleStats = (['Tank', 'DPS', 'Support'] as Role[]).map((role) => {
        const count = roleCounts.get(role) ?? 0;
        const winsForRole = roleWins.get(role) ?? 0;
        const winRate = count === 0 ? 0 : Math.round((winsForRole / count) * 100);
        return { role, count, wins: winsForRole, winRate };
      });

      let topRole: Role | '-' = '-';
      let topRoleCount = 0;
      roleCounts.forEach((count, role) => {
        if (count > topRoleCount) {
          topRole = role;
          topRoleCount = count;
        }
      });

      // Character Stats mit Winrate
      const characterStats = Array.from(characterCounts.entries()).map(([char, data]) => ({
        character: char,
        total: data.total,
        wins: data.wins,
        role: data.role,
        winRate: data.total === 0 ? 0 : Math.round((data.wins / data.total) * 100),
      }));

      // Top Character (meistgespielt)
      let topCharacter: string | '-' = '-';
      let topCharacterCount = 0;
      characterStats.forEach((stat) => {
        if (stat.total > topCharacterCount) {
          topCharacter = stat.character;
          topCharacterCount = stat.total;
        }
      });

      // Beste und schlechteste Character nach Winrate (min 2 Spiele)
      const eligibleChars = characterStats.filter((c) => c.total >= 2);
      const bestChar = eligibleChars.length > 0
        ? eligibleChars.reduce((a, b) => (a.winRate > b.winRate ? a : b))
        : null;
      const worstChar = eligibleChars.length > 0
        ? eligibleChars.reduce((a, b) => (a.winRate < b.winRate ? a : b))
        : null;

      return {
        name,
        wins,
        losses,
        total,
        winRate: rate,
        topRole,
        topRoleCount,
        topCharacter,
        topCharacterCount,
        highscore,
        roleStats,
        bestChar,
        worstChar,
      };
    });
  }, [roleFilteredMatches, roleFilter]);

  const comboStats = useMemo(() => {
    const roleOrder: Record<Role, number> = { Tank: 0, DPS: 1, Support: 2 };
    const stats = new Map<string, { wins: number; losses: number; players: PlayerEntry[] }>();

    roleFilteredMatches.forEach((match) => {
      const players = [...match.players].sort((a, b) => {
        const roleDiff = roleOrder[a.role] - roleOrder[b.role];
        if (roleDiff !== 0) return roleDiff;
        return a.name.localeCompare(b.name);
      });
      const key = players.map((player) => `${player.role}:${player.name}`).join('|');
      const entry = stats.get(key) ?? { wins: 0, losses: 0, players };
      if (match.result === 'Win') {
        entry.wins += 1;
      } else {
        entry.losses += 1;
      }
      stats.set(key, entry);
    });

    return Array.from(stats.values()).map((entry) => {
      const total = entry.wins + entry.losses;
      return {
        ...entry,
        total,
        winRate: total === 0 ? 0 : Math.round((entry.wins / total) * 100),
      };
    });
  }, [roleFilteredMatches]);

  const bestCombos = useMemo(() => {
    return [...comboStats]
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 3);
  }, [comboStats]);

  const worstCombos = useMemo(() => {
    return [...comboStats]
      .sort((a, b) => a.winRate - b.winRate)
      .slice(0, 3);
  }, [comboStats]);

  const heroStats = useMemo(() => {
    const stats = new Map<string, { hero: string; role: Role; wins: number; losses: number }>();
    matches.forEach((match) => {
      match.players.forEach((player) => {
        if (!player.character) return;
        const key = player.character;
        const entry = stats.get(key) ?? { hero: player.character, role: player.role, wins: 0, losses: 0 };
        if (match.result === 'Win') {
          entry.wins += 1;
        } else {
          entry.losses += 1;
        }
        stats.set(key, entry);
      });
    });
    return Array.from(stats.values()).map((entry) => {
      const total = entry.wins + entry.losses;
      return {
        ...entry,
        total,
        winRate: total === 0 ? 0 : Math.round((entry.wins / total) * 100),
      };
    });
  }, [matches]);

  const bestHeroes = useMemo(() => {
    return [...heroStats]
      .filter((h) => h.total >= 2)
      .sort((a, b) => b.winRate - a.winRate || b.total - a.total)
      .slice(0, 5);
  }, [heroStats]);

  const worstHeroes = useMemo(() => {
    return [...heroStats]
      .filter((h) => h.total >= 2)
      .sort((a, b) => a.winRate - b.winRate || b.total - a.total)
      .slice(0, 5);
  }, [heroStats]);

  const overallStats = useMemo(() => {
    const totalMatches = matches.length;
    const wins = matches.filter((m) => m.result === 'Win').length;
    const losses = totalMatches - wins;
    const winRate = totalMatches === 0 ? 0 : Math.round((wins / totalMatches) * 100);
    const stadiumMatches = matches.filter((m) => m.queue === 'Stadion').length;
    const ranglisteMatches = matches.filter((m) => m.queue === 'Rangliste').length;
    const stadiumWins = matches.filter((m) => m.queue === 'Stadion' && m.result === 'Win').length;
    const ranglisteWins = matches.filter((m) => m.queue === 'Rangliste' && m.result === 'Win').length;
    const stadiumWinRate = stadiumMatches === 0 ? 0 : Math.round((stadiumWins / stadiumMatches) * 100);
    const ranglisteWinRate = ranglisteMatches === 0 ? 0 : Math.round((ranglisteWins / ranglisteMatches) * 100);
    return {
      totalMatches,
      wins,
      losses,
      winRate,
      stadiumMatches,
      ranglisteMatches,
      stadiumWinRate,
      ranglisteWinRate,
    };
  }, [matches]);

  const updateDraft = (update: Partial<MatchEntry>) => {
    setDraft((prev) => ({ ...prev, ...update }));
  };

  const updatePlayer = (id: string, update: Partial<PlayerEntry>) => {
    setDraft((prev) => ({
      ...prev,
      players: prev.players.map((player) =>
        player.id === id ? { ...player, ...update } : player,
      ),
    }));
  };

  const addPlayer = () => {
    setDraft((prev) => ({
      ...prev,
      players:
        prev.players.length >= PLAYER_NAMES.length
          ? prev.players
          : [
              ...prev.players,
              createPlayer(
                generateId(),
                prev.players.map((player) => player.name),
              ),
            ],
    }));
  };

  const removePlayer = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      players: prev.players.filter((player) => player.id !== id),
    }));
  };

  const submitMatch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitLocked) return;
    const matchToSave: MatchEntry = {
      ...draft,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    try {
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(matchToSave),
      });
      if (!response.ok) {
        throw new Error('Failed to save match');
      }
      const saved = (await response.json()) as MatchEntry;
      setMatches((prev) => [saved, ...prev]);
      setDraft((prev) => resetDraft(prev));
      addToast('Match gespeichert');
      setSubmitLocked(true);
      window.setTimeout(() => setSubmitLocked(false), 5000);
    } catch {
      addToast('Match konnte nicht gespeichert werden');
      setSubmitLocked(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Soll das Match wirklich gelöscht werden?');
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/matches/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Failed to delete match');
      }
      setMatches((prev) => prev.filter((match) => match.id !== id));
      addToast('Match gelöscht');
    } catch {
      addToast('Match konnte nicht gelöscht werden');
    }
  };

  const handleExport = async () => {
    try {
      let exportPayload: {
        exportedAt: string;
        matches: MatchEntry[];
        improvements?: ImprovementTicket[];
      };
      const response = await fetch('/api/matches/export');
      if (response.ok) {
        exportPayload = (await response.json()) as {
          exportedAt: string;
          matches: MatchEntry[];
          improvements?: ImprovementTicket[];
        };
      } else {
        const fallbackResponse = await fetch('/api/matches');
        if (!fallbackResponse.ok) {
          throw new Error('Export failed');
        }
        const fallbackMatches = (await fallbackResponse.json()) as MatchEntry[];
        exportPayload = {
          exportedAt: new Date().toISOString(),
          matches: Array.isArray(fallbackMatches) ? fallbackMatches : [],
        };
      }
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'matches-export.json';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      addToast('Export erstellt');
    } catch {
      addToast('Export fehlgeschlagen');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const response = await fetch('/api/matches/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const fallbackMatches = Array.isArray(data) ? data : data?.matches;
        if (!Array.isArray(fallbackMatches)) {
          throw new Error('Import failed');
        }
        await Promise.all(
          fallbackMatches.map((match) =>
            fetch('/api/matches', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(match),
            }),
          ),
        );
      }
      await loadMatches();
      await loadImprovements();
      addToast('Import abgeschlossen');
    } catch {
      addToast('Import fehlgeschlagen');
    } finally {
      setImporting(false);
      event.target.value = '';
    }
  };

  const handleDeleteAll = async () => {
    const confirmed = window.confirm('Willst du wirklich alle Matches löschen?');
    if (!confirmed) return;
    try {
      const response = await fetch('/api/matches', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      await loadMatches();
      addToast('Alle Matches gelöscht');
    } catch {
      addToast('Löschen fehlgeschlagen');
    }
  };

  const handleDeleteAllImprovements = async () => {
    const confirmed = window.confirm('Willst du wirklich alle Vorschläge löschen?');
    if (!confirmed) return;
    try {
      const response = await fetch('/api/improvements', { method: 'DELETE' });
      if (!response.ok) {
        throw new Error('Delete failed');
      }
      await loadImprovements();
      addToast('Alle Vorschläge gelöscht');
    } catch {
      addToast('Löschen fehlgeschlagen');
    }
  };

  

  const getPlayerMatches = (name: string) =>
    roleFilteredMatches
      .filter((match) =>
        match.players.some(
          (player) =>
            player.name === name &&
            (roleFilter === 'Alle' || player.role === roleFilter),
        ),
      )
      .map((match) => {
        const playerEntry = match.players.find(
          (player) =>
            player.name === name &&
            (roleFilter === 'Alle' || player.role === roleFilter),
        );
        const role = playerEntry?.role ?? '-';
        const character = playerEntry?.character;
        const roleLabel = role === '-' ? '-' : ROLE_LABELS[role];
        return {
          ...match,
          playerRole: role,
          playerCharacter: character,
          playerRoleDisplay: character ? `${roleLabel} (${character})` : roleLabel,
          playerRoleClass: getRoleClass(role),
        };
      });

  const toggleSort = (playerName: string, key: SortKey) => {
    setPlayerSort((prev) => {
      const current = prev[playerName];
      const nextDirection: SortDirection =
        current.key === key && current.direction === 'desc' ? 'asc' : 'desc';
      return {
        ...prev,
        [playerName]: { key, direction: nextDirection },
      };
    });
  };

  const sortMatches = (
    items: Array<
      MatchEntry & {
        playerRole: string;
        playerCharacter?: string;
        playerRoleDisplay: string;
        playerRoleClass: string;
      }
    >,
    sort: SortState,
  ) => {
    const direction = sort.direction === 'asc' ? 1 : -1;
    return [...items].sort((a, b) => {
      let valueA = '';
      let valueB = '';

      switch (sort.key) {
        case 'date':
          return (
            (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
            direction
          );
        case 'result':
          valueA = a.result;
          valueB = b.result;
          break;
        case 'queue':
          valueA = a.queue;
          valueB = b.queue;
          break;
        case 'role':
          valueA = a.playerRole;
          valueB = b.playerRole;
          break;
        default:
          valueA = '';
          valueB = '';
      }

      return valueA.localeCompare(valueB) * direction;
    });
  };

  const sortedImprovements = useMemo(() => {
    return [...improvements].sort((a, b) => {
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [improvements]);

  const submitImprovement = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = improvementDraft.title.trim();
    const description = improvementDraft.description.trim();
    if (!title) {
      addToast('Bitte einen Titel angeben');
      return;
    }
    if (improvementsSubmitting) return;
    setImprovementsSubmitting(true);
    const ticket: ImprovementTicket = {
      id: generateId(),
      title,
      description,
      createdAt: new Date().toISOString(),
      completed: false,
      completedAt: null,
    };
    try {
      const response = await fetch('/api/improvements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ticket),
      });
      if (!response.ok) {
        throw new Error('Failed to save improvement');
      }
      const saved = (await response.json()) as ImprovementTicket;
      setImprovements((prev) => [saved, ...prev]);
      setImprovementDraft({ title: '', description: '' });
      addToast('Vorschlag gespeichert');
    } catch {
      addToast('Vorschlag konnte nicht gespeichert werden');
    } finally {
      setImprovementsSubmitting(false);
    }
  };

  const toggleImprovement = async (ticket: ImprovementTicket) => {
    try {
      const response = await fetch(`/api/improvements/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !ticket.completed }),
      });
      if (!response.ok) {
        throw new Error('Failed to update improvement');
      }
      const updated = (await response.json()) as ImprovementTicket;
      setImprovements((prev) =>
        prev.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
    } catch {
      addToast('Status konnte nicht aktualisiert werden');
    }
  };

  const getSortIndicator = (sort: SortState, key: SortKey) =>
    sort.key === key ? (sort.direction === 'asc' ? '↑' : '↓') : '';

  const selectedNames = draft.players.map((player) => player.name);
  const canAddPlayer = PLAYER_NAMES.some((name) => !selectedNames.includes(name));
  const getAvailableNames = (currentName: string) =>
    PLAYER_NAMES.filter((name) => name === currentName || !selectedNames.includes(name));

  if (!ultimateUnlocked) {
    return (
      <div className="ultimate-gate">
        <div className="ultimate-panel">
          <p className="ultimate-title">Zum Fortfahren nutze dein Ultimate</p>
          <div className="ultimate-meter" aria-label="Ultimate ready">
            <div className="ultimate-bars" aria-hidden="true" />
            <div className="ultimate-ring">
              <div className="ultimate-value">99%</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ow-page">
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className="toast">
            {toast.message}
          </div>
        ))}
      </div>
      <section className="ow-banner">
        <div className="ow-banner-content">
          <p className="eyebrow">Overwatch 2 Matchtracker</p>
          <h1>Overwatch 2 Matchtracker</h1>
          <p className="banner-subtitle">
            Tracke deine Rangliste- und Stadion-Matches, Winrates und Squad-Picks.
          </p>
        </div>
        <Link to="/archive" className="banner-corner-link">📁 Archiv</Link>
      </section>

      <section className="dashboard-grid">
        <div className="role-filter">
          <div>
            <h3>Rollenfilter</h3>
            <p className="muted">Alle Dashboards beziehen sich auf diese Rolle.</p>
          </div>
          <select
            className={roleFilter === 'Alle' ? '' : `role-select ${ROLE_CLASSES[roleFilter]}`}
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as Role | 'Alle')}
          >
            <option value="Alle">Alle Rollen</option>
            <option value="Tank">{ROLE_LABELS.Tank}</option>
            <option value="DPS">{ROLE_LABELS.DPS}</option>
            <option value="Support">{ROLE_LABELS.Support}</option>
          </select>
        </div>
        <div className="ow-card team-card">
          <div className="summary-header">
            <div>
              <h2>Team Dashboard</h2>
              <span className="summary-subtitle">
                {roleFilter === 'Alle' ? (
                  'Alle Rollen'
                ) : (
                  <>
                    Rolle:{' '}
                    <span className={getRoleClass(roleFilter)}>
                      {ROLE_LABELS[roleFilter]}
                    </span>
                  </>
                )}
              </span>
            </div>
          </div>
          <div className="stats">
            <div className="stat-card">
              <span className="stat-label">Winrate</span>
              <span className="stat-value">{winRate}%</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Matches</span>
              <span className="stat-value">{roleFilteredMatches.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Wins</span>
              <span className="stat-value">{winCount}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Losses</span>
              <span className="stat-value">{lossCount}</span>
            </div>
          </div>
          <div className="combo-grid">
            <div>
              <h3>Beste Kombis</h3>
              {bestCombos.length === 0 ? (
                <p className="empty">Noch keine Kombis erfasst.</p>
              ) : (
                <ul className="combo-list">
                  {bestCombos.map((combo) => (
                    <li
                      key={combo.players.map((p) => `${p.name}-${p.role}`).join('|')}
                      className="combo-item"
                    >
                      <strong>{combo.winRate}% Winrate</strong>
                      <span>{combo.wins}W / {combo.losses}L</span>
                      <div className="combo-players">
                        {combo.players.map((player) => (
                          <span key={player.id}>
                            {player.name} ·{' '}
                            <span className={getRoleClass(player.role)}>
                              {ROLE_LABELS[player.role]}
                            </span>
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3>Schwächste Kombis</h3>
              {worstCombos.length === 0 ? (
                <p className="empty">Noch keine Kombis erfasst.</p>
              ) : (
                <ul className="combo-list">
                  {worstCombos.map((combo) => (
                    <li
                      key={`${combo.players.map((p) => `${p.name}-${p.role}`).join('|')}-worst`}
                      className="combo-item"
                    >
                      <strong>{combo.winRate}% Winrate</strong>
                      <span>{combo.wins}W / {combo.losses}L</span>
                      <div className="combo-players">
                        {combo.players.map((player) => (
                          <span key={player.id}>
                            {player.name} ·{' '}
                            <span className={getRoleClass(player.role)}>
                              {ROLE_LABELS[player.role]}
                            </span>
                          </span>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="player-stats-grid">
          {playerStats.map((player) => (
            <div key={player.name} className="ow-card player-stat-card">
              <div className="player-stat-header">
                <h3>{player.name}</h3>
                <span className="player-role-badge">
                  {roleFilter === 'Alle' ? (
                    'Alle Rollen'
                  ) : (
                    <span className={getRoleClass(roleFilter)}>
                      {ROLE_LABELS[roleFilter]}
                    </span>
                  )}
                </span>
              </div>
              <div className="player-stat-line">
                <div>
                  <span>Winrate</span>
                  <strong>{player.winRate}%</strong>
                </div>
                <div>
                  <span>Matches</span>
                  <strong>{player.total}</strong>
                </div>
                <div>
                  <span>Wins</span>
                  <strong>{player.wins}</strong>
                </div>
                <div>
                  <span>Losses</span>
                  <strong>{player.losses}</strong>
                </div>
              </div>
              <div className="player-role-winrates">
                <span className="section-label">Winrate je Rolle</span>
                <div className="role-winrate-grid">
                  {player.roleStats.map((rs) => (
                    <div key={rs.role} className={`role-winrate-item ${ROLE_CLASSES[rs.role]}`}>
                      <span className="role-icon">{ROLE_LABELS[rs.role].split(' ')[0]}</span>
                      <span className="role-rate">{rs.count > 0 ? `${rs.winRate}%` : '-'}</span>
                      <span className="role-games">{rs.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="player-picks-grid">
                <div className="picks-column">
                  <span className="section-label">🏆 Tops</span>
                  <div className="pick-item">
                    <span className="pick-label">Rolle</span>
                    <span className="pick-value">
                      <span className={getRoleClass(player.topRole)}>
                        {formatRoleLabel(player.topRole)}
                      </span>
                      <span className="pick-count">{player.topRoleCount}×</span>
                    </span>
                  </div>
                  <div className="pick-item">
                    <span className="pick-label">Held</span>
                    <span className="pick-value">
                      {player.bestChar ? (
                        <>
                          {player.bestChar.character}
                          <span className="pick-rate win">{player.bestChar.winRate}%</span>
                        </>
                      ) : '-'}
                    </span>
                  </div>
                </div>
                <div className="picks-column">
                  <span className="section-label">📉 Flops</span>
                  <div className="pick-item">
                    <span className="pick-label">Held</span>
                    <span className="pick-value">
                      {player.worstChar ? (
                        <>
                          {player.worstChar.character}
                          <span className="pick-rate lose">{player.worstChar.winRate}%</span>
                        </>
                      ) : '-'}
                    </span>
                  </div>
                  <div className="pick-item">
                    <span className="pick-label">🏟️ Highscore</span>
                    <span className={`pick-value ${player.highscore ? 'highscore-value' : ''}`}>
                      {player.highscore !== null ? player.highscore.toLocaleString() : '-'}
                    </span>
                  </div>
                </div>
              </div>
              {(() => {
                const allPlayerMatches = getPlayerMatches(player.name);
                const sortedPlayerMatches = sortMatches(allPlayerMatches, playerSort[player.name]);
                const totalPages = Math.max(1, Math.ceil(sortedPlayerMatches.length / playerPageSize));
                const currentPage = Math.min(playerPage[player.name] || 1, totalPages);
                const paginatedPlayerMatches = sortedPlayerMatches.slice(
                  (currentPage - 1) * playerPageSize,
                  currentPage * playerPageSize,
                );
                return (
                  <>
                    <div className="player-table-wrapper">
                      <table className="player-table">
                        <thead>
                          <tr>
                            <th>
                              <button
                                type="button"
                                onClick={() => toggleSort(player.name, 'date')}
                              >
                                Datum {getSortIndicator(playerSort[player.name], 'date')}
                              </button>
                            </th>
                            <th>
                              <button
                                type="button"
                                onClick={() => toggleSort(player.name, 'result')}
                              >
                                Win {getSortIndicator(playerSort[player.name], 'result')}
                              </button>
                            </th>
                            <th>
                              <button
                                type="button"
                                onClick={() => toggleSort(player.name, 'queue')}
                              >
                                Modus {getSortIndicator(playerSort[player.name], 'queue')}
                              </button>
                            </th>
                            <th>
                              <button
                                type="button"
                                onClick={() => toggleSort(player.name, 'role')}
                              >
                                Rolle {getSortIndicator(playerSort[player.name], 'role')}
                              </button>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedPlayerMatches.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="empty-cell">
                                noch keine Einträge
                              </td>
                            </tr>
                          ) : (
                            paginatedPlayerMatches.map((match) => (
                              <tr
                                key={match.id}
                                className="player-table-row"
                                role="button"
                                tabIndex={0}
                                onClick={() => setSelectedMatch(match)}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    setSelectedMatch(match);
                                  }
                                }}
                              >
                                <td data-label="Datum">
                                  {new Date(match.createdAt).toLocaleDateString()}
                                </td>
                                <td
                                  data-label="Ergebnis"
                                  className={match.result === 'Win' ? 'win' : 'lose'}
                                >
                                  {match.result}
                                </td>
                                <td data-label="Modus">{match.queue}</td>
                                <td data-label="Rolle" className="role-cell">
                                  <span className={match.playerRoleClass}>{match.playerRoleDisplay}</span>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                    {totalPages > 1 && (
                      <div className="player-table-pagination">
                        <button
                          type="button"
                          onClick={() =>
                            setPlayerPage((prev) => ({
                              ...prev,
                              [player.name]: Math.max(1, currentPage - 1),
                            }))
                          }
                          disabled={currentPage === 1}
                        >
                          ◀
                        </button>
                        <span>
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setPlayerPage((prev) => ({
                              ...prev,
                              [player.name]: Math.min(totalPages, currentPage + 1),
                            }))
                          }
                          disabled={currentPage === totalPages}
                        >
                          ▶
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      </section>

      {selectedMatch && (
        <div
          className="match-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedMatch(null)}
        >
          <div
            className="match-overlay-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="match-overlay-header">
              <h3>Match Details</h3>
              <button type="button" onClick={() => setSelectedMatch(null)}>
                Schließen
              </button>
            </div>
            <div className="match-overlay-meta">
              <span>{new Date(selectedMatch.createdAt).toLocaleString()}</span>
              <span>{selectedMatch.queue}</span>
              <span className={selectedMatch.result === 'Win' ? 'win' : 'lose'}>
                {selectedMatch.result}
              </span>
              {selectedMatch.map && <span>Map: {selectedMatch.map}</span>}
            </div>
            <h4>Mitspieler</h4>
            <ul className="match-overlay-players">
              {selectedMatch.players.map((player) => (
                <li key={player.id}>
                  <span className="player-name">{player.name}</span>
                  <span className={getRoleClass(player.role)}>
                    {ROLE_LABELS[player.role]}
                  </span>
                  {player.character && (
                    <span className="player-hero">{player.character}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <main className="ow-grid">
        <section className="ow-card">
          <h2>Neues Match</h2>
          <form className="match-form" onSubmit={submitMatch}>
            <div className="form-row">
              <label>
                Rangliste / Stadion
                <div
                  className="segmented-toggle"
                  role="group"
                  aria-label="Rangliste oder Stadion"
                >
                  <button
                    type="button"
                    className={`segmented-button mode-competitive ${
                      draft.queue === 'Rangliste' ? 'active' : ''
                    }`}
                    aria-pressed={draft.queue === 'Rangliste'}
                    onClick={() => updateDraft({ queue: 'Rangliste', rank: '' })}
                  >
                    <svg
                      className="toggle-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2" />
                      <circle cx="12" cy="12" r="3" fill="currentColor" />
                    </svg>
                    <span>Rangliste</span>
                  </button>
                  <button
                    type="button"
                    className={`segmented-button mode-stadium ${
                      draft.queue === 'Stadion' ? 'active' : ''
                    }`}
                    aria-pressed={draft.queue === 'Stadion'}
                    onClick={() => updateDraft({ queue: 'Stadion', rank: '' })}
                  >
                    <svg
                      className="toggle-icon"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 18V8l8-4 8 4v10"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinejoin="round"
                      />
                      <path d="M7 18v-6h10v6" fill="none" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    <span>Stadion</span>
                  </button>
                </div>
              </label>
              <label>
                Win / Lose
                <div className="segmented-toggle" role="group" aria-label="Match Ergebnis">
                  <button
                    type="button"
                    className={`segmented-button result-win ${
                      draft.result === 'Win' ? 'active' : ''
                    }`}
                    aria-pressed={draft.result === 'Win'}
                    onClick={() => updateDraft({ result: 'Win' })}
                  >
                    <svg className="toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M6 12.5l4 4 8-9"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Win</span>
                  </button>
                  <button
                    type="button"
                    className={`segmented-button result-lose ${
                      draft.result === 'Lose' ? 'active' : ''
                    }`}
                    aria-pressed={draft.result === 'Lose'}
                    onClick={() => updateDraft({ result: 'Lose' })}
                  >
                    <svg className="toggle-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M7 7l10 10M17 7L7 17"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>Lose</span>
                  </button>
                </div>
              </label>
            </div>
            <div className="form-row">
              <label>
                Rang
                <select
                  value={draft.rank ?? ''}
                  onChange={(event) => updateDraft({ rank: event.target.value })}
                >
                  <option value="">Kein Rang</option>
                  {(RANK_OPTIONS[draft.queue] ?? COMPETITIVE_RANKS).map((rank) => (
                    <option key={rank} value={rank}>
                      {draft.queue === 'Stadion' && STADIUM_RANK_ICONS[rank]
                        ? `${STADIUM_RANK_ICONS[rank]} ${rank}`
                        : rank}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Map (optional)
                <input
                  type="text"
                  placeholder="z.B. Kings Row"
                  value={draft.map ?? ''}
                  onChange={(event) => updateDraft({ map: event.target.value })}
                />
              </label>
            </div>
            {draft.queue === 'Stadion' && (
              <div className="form-row">
                <label>
                  Punktestand (optional)
                  <input
                    type="number"
                    min="0"
                    placeholder="z.B. 12500"
                    value={draft.score ?? ''}
                    onChange={(event) =>
                      updateDraft({
                        score: event.target.value ? parseInt(event.target.value, 10) : undefined,
                      })
                    }
                  />
                </label>
              </div>
            )}
            <div className="players">
              <div className="players-header">
                <h3>Spieler im Match</h3>
                <button type="button" onClick={addPlayer} disabled={!canAddPlayer}>
                  + Spieler hinzufügen
                </button>
              </div>
              <div className="players-list">
                {draft.players.map((player, index) => (
                  <div key={player.id} className="player-card">
                    <div className="player-row player-inputs">
                      <label>
                        Name
                        <select
                          value={player.name}
                          onChange={(event) =>
                            updatePlayer(player.id, { name: event.target.value })
                          }
                        >
                          {getAvailableNames(player.name).map((name) => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="player-field role-field">
                        Rolle
                        <select
                          className={`role-select ${ROLE_CLASSES[player.role]}`}
                          value={player.role}
                          onChange={(event) =>
                            updatePlayer(player.id, {
                              role: event.target.value as Role,
                              character: '',
                            })
                          }
                        >
                          <option value="DPS">{ROLE_LABELS.DPS}</option>
                          <option value="Support">{ROLE_LABELS.Support}</option>
                          <option value="Tank">{ROLE_LABELS.Tank}</option>
                        </select>
                      </label>
                      <label>
                        Character (optional)
                        <select
                          value={player.character ?? ''}
                          onChange={(event) =>
                            updatePlayer(player.id, {
                              character: event.target.value || undefined,
                            })
                          }
                        >
                          <option value="">Keiner</option>
                          {ROLE_CHARACTERS[player.role].map((hero) => (
                            <option key={hero} value={hero}>
                              {hero}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <div className="player-actions">
                      <span>Spieler #{index + 1}</span>
                      {draft.players.length > 1 && (
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => removePlayer(player.id)}
                        >
                          Entfernen
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary" disabled={submitLocked}>
                {submitLocked ? 'Bitte warten...' : 'Match speichern'}
              </button>
            </div>
          </form>
        </section>

        <section className="ow-card matches">
          <div className="matches-header">
            <div>
              <h2>Letzte Matches</h2>
              <span className="muted">Zeigt die letzten 5 Einträge</span>
            </div>
            <button
              type="button"
              className="matches-view-all-btn"
              onClick={() => setShowAllMatches(true)}
            >
              <span>📊 Alle Matches</span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M9 5l7 7-7 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
          {latestMatches.length === 0 ? (
            <p className="empty">Noch keine Matches eingetragen.</p>
          ) : (
            <ul className="match-list">
              {latestMatches.map((match) => (
                <li key={match.id}>
                  <div className="match-main">
                    <strong>{match.result}</strong>
                    <span>
                      {match.queue}
                      {match.rank ? ` · ${match.rank}` : ''}
                    </span>
                    {match.map && <span>Map: {match.map}</span>}
                    <div className="match-players">
                      {match.players.map((player) => (
                        <div key={player.id} className="player-pill">
                          <span className="player-name">{player.name}</span>
                          <span className={`player-role ${getRoleClass(player.role)}`}>
                            {ROLE_LABELS[player.role]}
                          </span>
                          {player.character && (
                            <span className="player-hero">{player.character}</span>
                          )}
                        </div>
                      ))}
                    </div>
                    <span className="muted">
                      {new Date(match.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="match-actions">
                    <button
                      type="button"
                      className="icon-button danger"
                      onClick={() => handleDelete(match.id)}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M4 7h16"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M9 7V5h6v2"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <path
                          d="M7 7l1 12h8l1-12"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M10 11v6M14 11v6"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {showAllMatches && (
        <div
          className="fullscreen-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div className="fullscreen-overlay-content">
            <header className="fullscreen-header">
              <div className="fullscreen-header-left">
                <h2>📊 Match-Übersicht</h2>
                <span className="fullscreen-subtitle">
                  {filteredMatches.length} Matches gefunden
                </span>
              </div>
              <button
                type="button"
                className="fullscreen-close-btn"
                onClick={() => setShowAllMatches(false)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span>Schließen</span>
              </button>
            </header>

            <div className="fullscreen-body">
              <section className="stats-overview-section">
                <div className="stats-cards-row">
                  <div className="stat-card-large">
                    <div className="stat-icon">🎮</div>
                    <div className="stat-info">
                      <span className="stat-number">{overallStats.totalMatches}</span>
                      <span className="stat-title">Matches</span>
                    </div>
                  </div>
                  <div className="stat-card-large accent">
                    <div className="stat-icon">📈</div>
                    <div className="stat-info">
                      <span className="stat-number">{overallStats.winRate}%</span>
                      <span className="stat-title">Winrate</span>
                    </div>
                  </div>
                  <div className="stat-card-large win">
                    <div className="stat-icon">✓</div>
                    <div className="stat-info">
                      <span className="stat-number">{overallStats.wins}</span>
                      <span className="stat-title">Siege</span>
                    </div>
                  </div>
                  <div className="stat-card-large lose">
                    <div className="stat-icon">✗</div>
                    <div className="stat-info">
                      <span className="stat-number">{overallStats.losses}</span>
                      <span className="stat-title">Niederlagen</span>
                    </div>
                  </div>
                </div>
                <div className="mode-breakdown">
                  <div className="mode-stat">
                    <span className="mode-icon">🏟️</span>
                    <span className="mode-name">Stadion</span>
                    <span className="mode-count">{overallStats.stadiumMatches}</span>
                    <span className="mode-rate">{overallStats.stadiumWinRate}%</span>
                  </div>
                  <div className="mode-stat">
                    <span className="mode-icon">🎯</span>
                    <span className="mode-name">Rangliste</span>
                    <span className="mode-count">{overallStats.ranglisteMatches}</span>
                    <span className="mode-rate">{overallStats.ranglisteWinRate}%</span>
                  </div>
                </div>
              </section>

              <section className="hero-rankings-section">
                <div className="hero-ranking-card">
                  <h3>🏆 Top Helden</h3>
                  {bestHeroes.length === 0 ? (
                    <p className="empty-text">Noch keine Daten</p>
                  ) : (
                    <ul className="hero-ranking-list">
                      {bestHeroes.map((hero, i) => (
                        <li key={hero.hero} className="hero-ranking-item">
                          <span className="hero-position">{i + 1}</span>
                          <div className="hero-info">
                            <span className="hero-name">{hero.hero}</span>
                            <span className={`hero-role-badge ${ROLE_CLASSES[hero.role]}`}>
                              {ROLE_LABELS[hero.role]}
                            </span>
                          </div>
                          <div className="hero-winrate win">{hero.winRate}%</div>
                          <span className="hero-record">{hero.wins}W / {hero.losses}L</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="hero-ranking-card">
                  <h3>📉 Schwächste Helden</h3>
                  {worstHeroes.length === 0 ? (
                    <p className="empty-text">Noch keine Daten</p>
                  ) : (
                    <ul className="hero-ranking-list">
                      {worstHeroes.map((hero, i) => (
                        <li key={hero.hero} className="hero-ranking-item">
                          <span className="hero-position">{i + 1}</span>
                          <div className="hero-info">
                            <span className="hero-name">{hero.hero}</span>
                            <span className={`hero-role-badge ${ROLE_CLASSES[hero.role]}`}>
                              {ROLE_LABELS[hero.role]}
                            </span>
                          </div>
                          <div className="hero-winrate lose">{hero.winRate}%</div>
                          <span className="hero-record">{hero.wins}W / {hero.losses}L</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              <section className="matches-list-section">
                <div className="matches-section-header">
                  <h3>Match-Verlauf</h3>
                  <div className="matches-filters">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="🔍 Suchen..."
                      value={matchesFilters.search}
                      onChange={(event) =>
                        setMatchesFilters((prev) => ({
                          ...prev,
                          search: event.target.value,
                        }))
                      }
                    />
                    <select
                      value={matchesFilters.queue}
                      onChange={(event) =>
                        setMatchesFilters((prev) => ({
                          ...prev,
                          queue: event.target.value as MatchFilters['queue'],
                        }))
                      }
                    >
                      <option value="Alle">Alle Modi</option>
                      <option value="Rangliste">Rangliste</option>
                      <option value="Stadion">Stadion</option>
                    </select>
                    <select
                      value={matchesFilters.result}
                      onChange={(event) =>
                        setMatchesFilters((prev) => ({
                          ...prev,
                          result: event.target.value as MatchFilters['result'],
                        }))
                      }
                    >
                      <option value="Alle">Alle Ergebnisse</option>
                      <option value="Win">Nur Siege</option>
                      <option value="Lose">Nur Niederlagen</option>
                    </select>
                    <select
                      value={matchesFilters.role}
                      onChange={(event) =>
                        setMatchesFilters((prev) => ({
                          ...prev,
                          role: event.target.value as MatchFilters['role'],
                        }))
                      }
                    >
                      <option value="Alle">Alle Rollen</option>
                      <option value="Tank">{ROLE_LABELS.Tank}</option>
                      <option value="DPS">{ROLE_LABELS.DPS}</option>
                      <option value="Support">{ROLE_LABELS.Support}</option>
                    </select>
                  </div>
                </div>

                {paginatedMatches.length === 0 ? (
                  <div className="empty-state">
                    <p>Keine Matches gefunden.</p>
                  </div>
                ) : (
                  <div className="matches-grid">
                    {paginatedMatches.map((match) => (
                      <div
                        key={match.id}
                        className={`match-card-item ${match.result === 'Win' ? 'win' : 'lose'}`}
                      >
                        <div className="match-card-header">
                          <span className={`match-result-badge ${match.result === 'Win' ? 'win' : 'lose'}`}>
                            {match.result === 'Win' ? '✓ Sieg' : '✗ Niederlage'}
                          </span>
                          <span className="match-date">
                            {new Date(match.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="match-card-body">
                          <div className="match-mode">
                            <span className="mode-badge">{match.queue}</span>
                            {match.rank && <span className="rank-badge">{match.rank}</span>}
                            {match.score && <span className="score-badge">🏆 {match.score.toLocaleString()}</span>}
                          </div>
                          {match.map && <div className="match-map">📍 {match.map}</div>}
                          <div className="match-players-list">
                            {match.players.map((player) => (
                              <div key={player.id} className="match-player-chip">
                                <span className="player-name">{player.name}</span>
                                <span className={`player-role ${ROLE_CLASSES[player.role]}`}>
                                  {ROLE_LABELS[player.role]}
                                </span>
                                {player.character && (
                                  <span className="player-char">{player.character}</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pagination-bar">
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() => setMatchesPage((prev) => Math.max(1, prev - 1))}
                    disabled={activeMatchPage === 1}
                  >
                    ◀ Zurück
                  </button>
                  <span className="pagination-info">
                    Seite {activeMatchPage} von {totalMatchPages}
                  </span>
                  <button
                    type="button"
                    className="pagination-btn"
                    onClick={() =>
                      setMatchesPage((prev) => Math.min(totalMatchPages, prev + 1))
                    }
                    disabled={activeMatchPage === totalMatchPages}
                  >
                    Weiter ▶
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      <section className="ow-card import-export">
        <details>
          <summary>Import &amp; Export</summary>
          <div className="import-export-body">
            <p className="muted">
              Exportiere deine Matches als JSON-Datei oder importiere sie nach einem Umzug.
            </p>
            <div className="import-export-actions">
              <button type="button" className="primary" onClick={handleExport}>
                Export herunterladen
              </button>
              <label className="import-button">
                <input type="file" accept="application/json" onChange={handleImport} />
                {importing ? 'Import läuft...' : 'Importieren'}
              </label>
              <button
                type="button"
                className="danger-button"
                onClick={handleDeleteAll}
              >
                Alles löschen
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={handleDeleteAllImprovements}
              >
                Alle Vorschläge löschen
              </button>
              
            </div>
          </div>
        </details>
      </section>

      <section className="ow-card improvements">
        <details>
          <summary>Verbesserungsvorschläge</summary>
          <div className="improvements-body">
            <p className="muted">
              Teile Änderungswünsche mit dem Team. Abgehakte Tickets werden grün markiert
              und wandern ans Ende der Liste.
            </p>
            <form className="improvement-form" onSubmit={submitImprovement}>
              <label>
                Titel
                <input
                  type="text"
                  placeholder="z.B. Neues Dashboard-Widget"
                  value={improvementDraft.title}
                  onChange={(event) =>
                    setImprovementDraft((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Beschreibung (optional)
                <textarea
                  rows={3}
                  placeholder="Was soll sich verbessern?"
                  value={improvementDraft.description}
                  onChange={(event) =>
                    setImprovementDraft((prev) => ({
                      ...prev,
                      description: event.target.value,
                    }))
                  }
                />
              </label>
              <div className="form-actions">
                <button
                  type="submit"
                  className="primary"
                  disabled={improvementsSubmitting}
                >
                  {improvementsSubmitting ? 'Speichern...' : 'Vorschlag senden'}
                </button>
              </div>
            </form>
            <div className="improvement-list-wrapper">
              <h3>Aktuelle Tickets</h3>
              {improvementsLoading ? (
                <p className="muted">Lade Vorschläge...</p>
              ) : sortedImprovements.length === 0 ? (
                <p className="empty">Noch keine Vorschläge vorhanden.</p>
              ) : (
                <ul className="improvement-list">
                  {sortedImprovements.map((ticket) => (
                    <li
                      key={ticket.id}
                      className={`improvement-item ${ticket.completed ? 'completed' : ''}`}
                    >
                      <div>
                        <div className="improvement-title">{ticket.title}</div>
                        {ticket.description && (
                          <p className="improvement-description">{ticket.description}</p>
                        )}
                        <span className="muted">
                          {new Date(ticket.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="improvement-actions">
                        <button
                          type="button"
                          className={ticket.completed ? 'completed' : ''}
                          onClick={() => toggleImprovement(ticket)}
                        >
                          {ticket.completed ? 'Erledigt' : 'Offen'}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}