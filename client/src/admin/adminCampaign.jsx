import { createContext, useContext, useEffect, useState } from 'react';
import { getAdminCampaigns } from '../api';

const STORAGE_KEY = 'adminCampaignId';
const DEFAULT_ID = 'niterra-ngk-2026';

const AdminCampaignContext = createContext({
  campaignId: DEFAULT_ID,
  campaigns: [],
  setCampaignId: () => {},
});

export function AdminCampaignProvider({ children }) {
  const [campaignId, setCampaignIdState] = useState(() => localStorage.getItem(STORAGE_KEY) || DEFAULT_ID);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    getAdminCampaigns()
      .then((data) => {
        const list = data.campaigns || [];
        setCampaigns(list);
        if (list.length && !list.some((c) => c.id === campaignId)) {
          setCampaignIdState(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  function setCampaignId(id) {
    localStorage.setItem(STORAGE_KEY, id);
    setCampaignIdState(id);
  }

  const campaign = campaigns.find((c) => c.id === campaignId) || null;

  return (
    <AdminCampaignContext.Provider value={{ campaignId, campaign, campaigns, setCampaignId }}>
      {children}
    </AdminCampaignContext.Provider>
  );
}

export function useAdminCampaign() {
  return useContext(AdminCampaignContext);
}

export function campaignPreviewPath(campaignId) {
  if (campaignId === 'hoka-2026') return '/enter?device=PR-PUK2-001';
  if (campaignId === 'niterra-ngk-2026') return '/enter/repco';
  if (campaignId === 'audi-2026') return '/enter/audi-instant-win';
  return `/enter?campaign=${encodeURIComponent(campaignId)}`;
}
