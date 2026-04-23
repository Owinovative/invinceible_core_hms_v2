'use client';

import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [formState, setFormState] = useState({
    FACILITY_NAME: '',
    CONTACT_EMAIL: '',
    DEFAULT_CURRENCY: 'USD',
    FACILITY_ADDRESS: '',
    TIMEZONE: 'UTC',
  });

  // 1. Fetch current settings from Backend
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('http://localhost:3000/settings'); // Adjust URL if needed
        const data = await response.json();
        
        // Map the array from DB to our object state
        const newState = { ...formState };
        data.forEach((s: any) => {
          if (s.settingKey in newState) {
            newState[s.settingKey as keyof typeof formState] = s.settingValue;
          }
        });
        setFormState(newState);
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  // 2. Save Section Logic
  const handleSave = async (keys: string[]) => {
    try {
      const updates = keys.map(key => 
        fetch(`http://localhost:3000/settings/key/${key}/value`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: formState[key as keyof typeof formState] })
        })
      );
      await Promise.all(updates);
      alert('Settings updated successfully! ✅');
    } catch (err) {
      alert('Update failed. Check console.');
    }
  };

  if (loading) return <div className="p-10">Loading System Config...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">Hospital Management Settings</h1>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6 border-b">
        {['general', 'contact', 'billing'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-4 capitalize ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600 font-bold' : 'text-gray-500'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white shadow-md rounded-xl p-8 border">
        {/* GENERAL TAB */}
        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Hospital Name</label>
              <input 
                type="text" 
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={formState.FACILITY_NAME}
                onChange={(e) => setFormState({...formState, FACILITY_NAME: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">System Timezone</label>
              <select 
                className="w-full p-3 border rounded-lg"
                value={formState.TIMEZONE}
                onChange={(e) => setFormState({...formState, TIMEZONE: e.target.value})}
              >
                <option value="UTC">UTC (Default)</option>
                <option value="Africa/Nairobi">EAT (Nairobi)</option>
              </select>
            </div>
            <button 
              onClick={() => handleSave(['FACILITY_NAME', 'TIMEZONE'])}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Save General Changes
            </button>
          </div>
        )}

        {/* CONTACT TAB */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Admin Email</label>
              <input 
                type="email" 
                className="w-full p-3 border rounded-lg"
                value={formState.CONTACT_EMAIL}
                onChange={(e) => setFormState({...formState, CONTACT_EMAIL: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Physical Address</label>
              <textarea 
                className="w-full p-3 border rounded-lg"
                value={formState.FACILITY_ADDRESS}
                onChange={(e) => setFormState({...formState, FACILITY_ADDRESS: e.target.value})}
              />
            </div>
            <button 
              onClick={() => handleSave(['CONTACT_EMAIL', 'FACILITY_ADDRESS'])}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Save Contact Details
            </button>
          </div>
        )}

        {/* BILLING TAB */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Default Currency</label>
              <select 
                className="w-full p-3 border rounded-lg"
                value={formState.DEFAULT_CURRENCY}
                onChange={(e) => setFormState({...formState, DEFAULT_CURRENCY: e.target.value})}
              >
                <option value="USD">USD ($)</option>
                <option value="KES">KES (KSh)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <button 
              onClick={() => handleSave(['DEFAULT_CURRENCY'])}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Save Billing Config
            </button>
          </div>
        )}
      </div>
    </div>
  );
}