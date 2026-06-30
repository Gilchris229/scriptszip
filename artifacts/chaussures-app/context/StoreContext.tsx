import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { genId, getCurrentMonth } from '@/utils';

export interface Achat {
  id: string;
  modele: string;
  pointure: string;
  couleur: string;
  quantiteAchetee: number;
  prixAchat: number;
  prixVente: number;
  dateAchat: string;
  fournisseur: string;
  createdAt: string;
}

export interface Vente {
  id: string;
  achatId: string;
  modele: string;
  pointure: string;
  couleur: string;
  quantite: number;
  prixUnitaire: number;
  montantTotal: number;
  dateVente: string;
  client: string;
  estCredit: boolean;
  montantPaye: number;
  resteAPayer: number;
  createdAt: string;
}

export interface PaiementCredit {
  id: string;
  venteId: string;
  montant: number;
  date: string;
  createdAt: string;
}

export interface Reglages {
  nomBoutique: string;
  telephone: string;
  adresse: string;
}

const KEYS = {
  ACHATS: '@chaussures/achats',
  VENTES: '@chaussures/ventes',
  PAIEMENTS: '@chaussures/paiements',
  REGLAGES: '@chaussures/reglages',
};

const DEFAULT_REGLAGES: Reglages = {
  nomBoutique: 'Ma Boutique',
  telephone: '',
  adresse: '',
};

interface KPIs {
  chiffreAffaires: number;
  benefice: number;
  totalAchats: number;
  nbVentes: number;
  montantCredit: number;
  nbArticlesStock: number;
}

interface StockItem {
  achat: Achat;
  quantiteVendue: number;
  quantiteRestante: number;
}

interface StoreContextValue {
  achats: Achat[];
  ventes: Vente[];
  paiements: PaiementCredit[];
  reglages: Reglages;
  isLoading: boolean;
  getStockForAchat: (achatId: string) => number;
  getStockList: () => StockItem[];
  addAchat: (data: Omit<Achat, 'id' | 'createdAt'>) => Promise<Achat>;
  updateAchat: (id: string, updates: Partial<Omit<Achat, 'id' | 'createdAt'>>) => Promise<void>;
  deleteAchat: (id: string) => Promise<void>;
  addVente: (data: Omit<Vente, 'id' | 'createdAt'>) => Promise<Vente>;
  updateVente: (id: string, updates: Partial<Omit<Vente, 'id' | 'createdAt'>>) => Promise<void>;
  addPaiementCredit: (data: Omit<PaiementCredit, 'id' | 'createdAt'>) => Promise<void>;
  updateReglages: (updates: Partial<Reglages>) => Promise<void>;
  getKPIs: (month?: string) => KPIs;
  getMonthlyData: () => Array<{ mois: string; ca: number; benefice: number }>;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [achats, setAchats] = useState<Achat[]>([]);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [paiements, setPaiements] = useState<PaiementCredit[]>([]);
  const [reglages, setReglages] = useState<Reglages>(DEFAULT_REGLAGES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [a, v, p, r] = await Promise.all([
          AsyncStorage.getItem(KEYS.ACHATS),
          AsyncStorage.getItem(KEYS.VENTES),
          AsyncStorage.getItem(KEYS.PAIEMENTS),
          AsyncStorage.getItem(KEYS.REGLAGES),
        ]);
        if (a) setAchats(JSON.parse(a));
        if (v) setVentes(JSON.parse(v));
        if (p) setPaiements(JSON.parse(p));
        if (r) setReglages({ ...DEFAULT_REGLAGES, ...JSON.parse(r) });
      } catch (e) {
        console.error('Load error:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const saveAchats = useCallback(async (data: Achat[]) => {
    await AsyncStorage.setItem(KEYS.ACHATS, JSON.stringify(data));
  }, []);
  const saveVentes = useCallback(async (data: Vente[]) => {
    await AsyncStorage.setItem(KEYS.VENTES, JSON.stringify(data));
  }, []);
  const savePaiements = useCallback(async (data: PaiementCredit[]) => {
    await AsyncStorage.setItem(KEYS.PAIEMENTS, JSON.stringify(data));
  }, []);
  const saveReglages = useCallback(async (data: Reglages) => {
    await AsyncStorage.setItem(KEYS.REGLAGES, JSON.stringify(data));
  }, []);

  const getStockForAchat = useCallback((achatId: string): number => {
    const achat = achats.find(a => a.id === achatId);
    if (!achat) return 0;
    const vendu = ventes
      .filter(v => v.achatId === achatId)
      .reduce((sum, v) => sum + v.quantite, 0);
    return Math.max(0, achat.quantiteAchetee - vendu);
  }, [achats, ventes]);

  const getStockList = useCallback((): StockItem[] => {
    return achats.map(achat => {
      const quantiteVendue = ventes
        .filter(v => v.achatId === achat.id)
        .reduce((sum, v) => sum + v.quantite, 0);
      return {
        achat,
        quantiteVendue,
        quantiteRestante: Math.max(0, achat.quantiteAchetee - quantiteVendue),
      };
    });
  }, [achats, ventes]);

  const addAchat = useCallback(async (data: Omit<Achat, 'id' | 'createdAt'>): Promise<Achat> => {
    const achat: Achat = { ...data, id: genId(), createdAt: new Date().toISOString() };
    const updated = [achat, ...achats];
    setAchats(updated);
    await saveAchats(updated);
    return achat;
  }, [achats, saveAchats]);

  const updateAchat = useCallback(async (id: string, updates: Partial<Omit<Achat, 'id' | 'createdAt'>>) => {
    const updated = achats.map(a => a.id === id ? { ...a, ...updates } : a);
    setAchats(updated);
    await saveAchats(updated);
  }, [achats, saveAchats]);

  const deleteAchat = useCallback(async (id: string) => {
    const updatedAchats = achats.filter(a => a.id !== id);
    setAchats(updatedAchats);
    await saveAchats(updatedAchats);
    const updatedVentes = ventes.filter(v => v.achatId !== id);
    setVentes(updatedVentes);
    await saveVentes(updatedVentes);
  }, [achats, ventes, saveAchats, saveVentes]);

  const addVente = useCallback(async (data: Omit<Vente, 'id' | 'createdAt'>): Promise<Vente> => {
    const vente: Vente = { ...data, id: genId(), createdAt: new Date().toISOString() };
    const updated = [vente, ...ventes];
    setVentes(updated);
    await saveVentes(updated);
    return vente;
  }, [ventes, saveVentes]);

  const updateVente = useCallback(async (id: string, updates: Partial<Omit<Vente, 'id' | 'createdAt'>>) => {
    const updated = ventes.map(v => v.id === id ? { ...v, ...updates } : v);
    setVentes(updated);
    await saveVentes(updated);
  }, [ventes, saveVentes]);

  const addPaiementCredit = useCallback(async (data: Omit<PaiementCredit, 'id' | 'createdAt'>) => {
    const paiement: PaiementCredit = { ...data, id: genId(), createdAt: new Date().toISOString() };
    const updatedP = [paiement, ...paiements];
    setPaiements(updatedP);
    await savePaiements(updatedP);
    // Update the related vente
    const vente = ventes.find(v => v.id === data.venteId);
    if (vente) {
      const newMontantPaye = Math.min(vente.montantPaye + data.montant, vente.montantTotal);
      const newReste = Math.max(0, vente.resteAPayer - data.montant);
      await updateVente(vente.id, { montantPaye: newMontantPaye, resteAPayer: newReste });
    }
  }, [paiements, ventes, savePaiements, updateVente]);

  const updateReglages = useCallback(async (updates: Partial<Reglages>) => {
    const updated = { ...reglages, ...updates };
    setReglages(updated);
    await saveReglages(updated);
  }, [reglages, saveReglages]);

  const getKPIs = useCallback((month?: string): KPIs => {
    const filteredVentes = month ? ventes.filter(v => v.dateVente.startsWith(month)) : ventes;
    const filteredAchats = month ? achats.filter(a => a.dateAchat.startsWith(month)) : achats;
    const chiffreAffaires = filteredVentes.reduce((sum, v) => sum + v.montantTotal, 0);
    const benefice = filteredVentes.reduce((sum, v) => {
      const achat = achats.find(a => a.id === v.achatId);
      if (!achat) return sum;
      return sum + (v.prixUnitaire - achat.prixAchat) * v.quantite;
    }, 0);
    const totalAchats = filteredAchats.reduce((sum, a) => sum + a.prixAchat * a.quantiteAchetee, 0);
    const nbVentes = filteredVentes.length;
    const montantCredit = ventes.reduce((sum, v) => sum + (v.resteAPayer || 0), 0);
    const nbArticlesStock = achats.reduce((sum, a) => {
      const vendu = ventes.filter(v => v.achatId === a.id).reduce((s, v) => s + v.quantite, 0);
      return sum + Math.max(0, a.quantiteAchetee - vendu);
    }, 0);
    return { chiffreAffaires, benefice, totalAchats, nbVentes, montantCredit, nbArticlesStock };
  }, [achats, ventes]);

  const getMonthlyData = useCallback(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mv = ventes.filter(v => v.dateVente.startsWith(key));
      const ca = mv.reduce((s, v) => s + v.montantTotal, 0);
      const benefice = mv.reduce((s, v) => {
        const a = achats.find(ac => ac.id === v.achatId);
        return a ? s + (v.prixUnitaire - a.prixAchat) * v.quantite : s;
      }, 0);
      return { mois: key, ca, benefice };
    });
  }, [achats, ventes]);

  const value = useMemo<StoreContextValue>(() => ({
    achats, ventes, paiements, reglages, isLoading,
    getStockForAchat, getStockList,
    addAchat, updateAchat, deleteAchat,
    addVente, updateVente,
    addPaiementCredit,
    updateReglages,
    getKPIs, getMonthlyData,
  }), [
    achats, ventes, paiements, reglages, isLoading,
    getStockForAchat, getStockList,
    addAchat, updateAchat, deleteAchat,
    addVente, updateVente,
    addPaiementCredit,
    updateReglages,
    getKPIs, getMonthlyData,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be within StoreProvider');
  return ctx;
}
