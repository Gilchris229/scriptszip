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

export interface PaiementVenteCredit {
  id: string;
  montant: number;
  date: string;
}

export interface VenteCredit {
  id: string; // CRED-XXXX
  // Client
  clientNom: string;
  clientTelephone: string;
  clientAdresse: string;
  // Article
  achatId: string;
  modele: string;
  pointure: string;
  couleur: string;
  quantite: number;
  // Montants
  prixTotal: number;
  acompte: number;
  resteAPayer: number;
  // Dates
  dateVente: string;
  dateEcheance: string;
  // Meta
  note: string;
  statut: 'en_cours' | 'solde';
  paiements: PaiementVenteCredit[];
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
  VENTES_CREDIT: 'ventes_credit',
};

const DEFAULT_REGLAGES: Reglages = {
  nomBoutique: 'Ma Boutique',
  telephone: '',
  adresse: '',
};

function genCreditId(existing: VenteCredit[]): string {
  const max = existing.reduce((m, c) => {
    const n = parseInt(c.id.replace('CRED-', ''), 10);
    return isNaN(n) ? m : Math.max(m, n);
  }, 0);
  return `CRED-${String(max + 1).padStart(4, '0')}`;
}

interface KPIs {
  chiffreAffaires: number;
  benefice: number;
  totalAchats: number;
  nbVentes: number;
  montantCredit: number;
  nbArticlesStock: number;
  totalCreances: number;
  capitalInvesti: number;
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
  ventesCredit: VenteCredit[];
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
  addVenteCredit: (data: Omit<VenteCredit, 'id' | 'statut' | 'paiements' | 'createdAt'>) => Promise<VenteCredit>;
  addPaiementVenteCredit: (creditId: string, montant: number, date: string) => Promise<void>;
  updateReglages: (updates: Partial<Reglages>) => Promise<void>;
  getKPIs: (month?: string) => KPIs;
  getMonthlyData: () => Array<{ mois: string; ca: number; benefice: number }>;
  getTotalCreances: () => number;
}

const StoreContext = createContext<StoreContextValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [achats, setAchats] = useState<Achat[]>([]);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [paiements, setPaiements] = useState<PaiementCredit[]>([]);
  const [ventesCredit, setVentesCredit] = useState<VenteCredit[]>([]);
  const [reglages, setReglages] = useState<Reglages>(DEFAULT_REGLAGES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [a, v, p, r, vc] = await Promise.all([
          AsyncStorage.getItem(KEYS.ACHATS),
          AsyncStorage.getItem(KEYS.VENTES),
          AsyncStorage.getItem(KEYS.PAIEMENTS),
          AsyncStorage.getItem(KEYS.REGLAGES),
          AsyncStorage.getItem(KEYS.VENTES_CREDIT),
        ]);
        if (a) setAchats(JSON.parse(a));
        if (v) setVentes(JSON.parse(v));
        if (p) setPaiements(JSON.parse(p));
        if (r) setReglages({ ...DEFAULT_REGLAGES, ...JSON.parse(r) });
        if (vc) setVentesCredit(JSON.parse(vc));
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
  const saveVentesCredit = useCallback(async (data: VenteCredit[]) => {
    await AsyncStorage.setItem(KEYS.VENTES_CREDIT, JSON.stringify(data));
  }, []);
  const saveReglages = useCallback(async (data: Reglages) => {
    await AsyncStorage.setItem(KEYS.REGLAGES, JSON.stringify(data));
  }, []);

  // Stock calculations include both ventes and ventesCredit quantities
  const getStockForAchat = useCallback((achatId: string): number => {
    const achat = achats.find(a => a.id === achatId);
    if (!achat) return 0;
    const vendu = ventes.filter(v => v.achatId === achatId).reduce((sum, v) => sum + v.quantite, 0);
    const venduCredit = ventesCredit.filter(vc => vc.achatId === achatId).reduce((sum, vc) => sum + vc.quantite, 0);
    return Math.max(0, achat.quantiteAchetee - vendu - venduCredit);
  }, [achats, ventes, ventesCredit]);

  const getStockList = useCallback((): StockItem[] => {
    return achats.map(achat => {
      const quantiteVendue =
        ventes.filter(v => v.achatId === achat.id).reduce((sum, v) => sum + v.quantite, 0) +
        ventesCredit.filter(vc => vc.achatId === achat.id).reduce((sum, vc) => sum + vc.quantite, 0);
      return {
        achat,
        quantiteVendue,
        quantiteRestante: Math.max(0, achat.quantiteAchetee - quantiteVendue),
      };
    });
  }, [achats, ventes, ventesCredit]);

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
    const updatedVC = ventesCredit.filter(vc => vc.achatId !== id);
    setVentesCredit(updatedVC);
    await saveVentesCredit(updatedVC);
  }, [achats, ventes, ventesCredit, saveAchats, saveVentes, saveVentesCredit]);

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
    const vente = ventes.find(v => v.id === data.venteId);
    if (vente) {
      const newMontantPaye = Math.min(vente.montantPaye + data.montant, vente.montantTotal);
      const newReste = Math.max(0, vente.resteAPayer - data.montant);
      await updateVente(vente.id, { montantPaye: newMontantPaye, resteAPayer: newReste });
    }
  }, [paiements, ventes, savePaiements, updateVente]);

  const addVenteCredit = useCallback(async (
    data: Omit<VenteCredit, 'id' | 'statut' | 'paiements' | 'createdAt'>
  ): Promise<VenteCredit> => {
    const credit: VenteCredit = {
      ...data,
      id: genCreditId(ventesCredit),
      statut: data.resteAPayer > 0 ? 'en_cours' : 'solde',
      paiements: data.acompte > 0
        ? [{ id: genId(), montant: data.acompte, date: data.dateVente }]
        : [],
      createdAt: new Date().toISOString(),
    };
    const updated = [credit, ...ventesCredit];
    setVentesCredit(updated);
    await saveVentesCredit(updated);
    return credit;
  }, [ventesCredit, saveVentesCredit]);

  const addPaiementVenteCredit = useCallback(async (creditId: string, montant: number, date: string) => {
    const updated = ventesCredit.map(vc => {
      if (vc.id !== creditId) return vc;
      const newReste = Math.max(0, vc.resteAPayer - montant);
      const newPaiement: PaiementVenteCredit = { id: genId(), montant, date };
      return {
        ...vc,
        resteAPayer: newReste,
        statut: (newReste === 0 ? 'solde' : 'en_cours') as VenteCredit['statut'],
        paiements: [newPaiement, ...vc.paiements],
      };
    });
    setVentesCredit(updated);
    await saveVentesCredit(updated);
  }, [ventesCredit, saveVentesCredit]);

  const updateReglages = useCallback(async (updates: Partial<Reglages>) => {
    const updated = { ...reglages, ...updates };
    setReglages(updated);
    await saveReglages(updated);
  }, [reglages, saveReglages]);

  const getTotalCreances = useCallback((): number => {
    return ventesCredit.filter(vc => vc.statut === 'en_cours').reduce((s, vc) => s + vc.resteAPayer, 0);
  }, [ventesCredit]);

  const getKPIs = useCallback((month?: string): KPIs => {
    const filteredVentes = month ? ventes.filter(v => v.dateVente.startsWith(month)) : ventes;
    const filteredAchats = month ? achats.filter(a => a.dateAchat.startsWith(month)) : achats;

    // CA = ventes ordinaires + paiements de crédit encaissés ce mois (par date d'encaissement)
    const chiffreAffaires =
      filteredVentes.reduce((sum, v) => sum + v.montantTotal, 0) +
      ventesCredit.reduce((sum, vc) => {
        const paiementsMois = month
          ? vc.paiements.filter(p => p.date.startsWith(month))
          : vc.paiements;
        return sum + paiementsMois.reduce((s, p) => s + p.montant, 0);
      }, 0);

    // Bénéfice = marge sur ventes ordinaires + marge proportionnelle sur paiements encaissés
    const benefice =
      filteredVentes.reduce((sum, v) => {
        const achat = achats.find(a => a.id === v.achatId);
        if (!achat) return sum;
        return sum + (v.prixUnitaire - achat.prixAchat) * v.quantite;
      }, 0) +
      ventesCredit.reduce((sum, vc) => {
        const achat = achats.find(a => a.id === vc.achatId);
        if (!achat) return sum;
        const paiementsMois = month
          ? vc.paiements.filter(p => p.date.startsWith(month))
          : vc.paiements;
        const totalPaye = paiementsMois.reduce((s, p) => s + p.montant, 0);
        if (totalPaye === 0 || vc.prixTotal === 0) return sum;
        const coutProportion = (totalPaye / vc.prixTotal) * vc.quantite * achat.prixAchat;
        return sum + (totalPaye - coutProportion);
      }, 0);

    const totalAchats = filteredAchats.reduce((sum, a) => sum + a.prixAchat * a.quantiteAchetee, 0);
    const nbVentes = filteredVentes.length + ventesCredit.filter(vc => month ? vc.paiements.some(p => p.date.startsWith(month)) : true).length;

    // Montant crédit encours = reste à payer sur toutes les ventes à crédit en cours
    const montantCredit = ventesCredit
      .filter(vc => vc.statut === 'en_cours')
      .reduce((sum, vc) => sum + vc.resteAPayer, 0);

    const nbArticlesStock = achats.reduce((sum, a) => {
      const vendu =
        ventes.filter(v => v.achatId === a.id).reduce((s, v) => s + v.quantite, 0) +
        ventesCredit.filter(vc => vc.achatId === a.id).reduce((s, vc) => s + vc.quantite, 0);
      return sum + Math.max(0, a.quantiteAchetee - vendu);
    }, 0);
    const totalCreances = ventesCredit
      .filter(vc => vc.statut === 'en_cours')
      .reduce((s, vc) => s + vc.resteAPayer, 0);
    const capitalInvesti = achats.reduce((sum, a) => sum + a.prixAchat * a.quantiteAchetee, 0);
    return { chiffreAffaires, benefice, totalAchats, nbVentes, montantCredit, nbArticlesStock, totalCreances, capitalInvesti };
  }, [achats, ventes, ventesCredit]);

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
    achats, ventes, paiements, ventesCredit, reglages, isLoading,
    getStockForAchat, getStockList,
    addAchat, updateAchat, deleteAchat,
    addVente, updateVente,
    addPaiementCredit,
    addVenteCredit, addPaiementVenteCredit,
    updateReglages,
    getKPIs, getMonthlyData, getTotalCreances,
  }), [
    achats, ventes, paiements, ventesCredit, reglages, isLoading,
    getStockForAchat, getStockList,
    addAchat, updateAchat, deleteAchat,
    addVente, updateVente,
    addPaiementCredit,
    addVenteCredit, addPaiementVenteCredit,
    updateReglages,
    getKPIs, getMonthlyData, getTotalCreances,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be within StoreProvider');
  return ctx;
}
