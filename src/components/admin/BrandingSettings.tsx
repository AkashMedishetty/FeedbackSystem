'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Save, RefreshCw, Palette, Image, Type, MessageSquare, Eye, X } from 'lucide-react';
import { toast } from 'sonner';

interface HospitalSettings {
  _id?: string;
  hospitalName: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  welcomeMessage: string;
  thankYouMessage: string;
  contactInfo?: string;
  theme: 'light' | 'dark' | 'high-contrast';
  language: string;
  sessionTimeout: number;
}

const BrandingSettings: React.FC = () => {
  const [settings, setSettings] = useState<HospitalSettings>({
    hospitalName: '',
    primaryColor: '#3B82F6',
    secondaryColor: '#1F2937',
    accentColor: '#10B981',
    welcomeMessage: 'Welcome! Please share your feedback.',
    thankYouMessage: 'Thank you for your valuable feedback!',
    contactInfo: '',
    theme: 'light',
    language: 'en',
    sessionTimeout: 5
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/branding');
      
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load branding settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/admin/settings/branding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const updatedSettings = await response.json();
        setSettings(updatedSettings);
        toast.success('Branding settings saved successfully!');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save branding settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('Image size should be less than 5MB');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/admin/settings/upload-logo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const { logoUrl } = await response.json();
        setSettings(prev => ({ ...prev, logo: logoUrl }));
        toast.success('Logo uploaded successfully!');
      } else {
        throw new Error('Failed to upload logo');
      }
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleLogoUpload(file);
    }
  };

  const removeLogo = () => {
    setSettings(prev => ({ ...prev, logo: undefined }));
  };

  const resetToDefaults = () => {
    setSettings({
      hospitalName: '',
      primaryColor: '#3B82F6',
      secondaryColor: '#1F2937',
      accentColor: '#10B981',
      welcomeMessage: 'Welcome! Please share your feedback.',
      thankYouMessage: 'Thank you for your valuable feedback!',
      contactInfo: '',
      theme: 'light',
      language: 'en',
      sessionTimeout: 5
    });
    toast.info('Settings reset to defaults');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading branding settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Branding Settings</h2>
          <p className="text-gray-600 mt-1">Customize your hospital's branding and appearance</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Eye className="w-4 h-4 mr-2" />
            {previewMode ? 'Edit Mode' : 'Preview'}
          </button>
          
          <button
            onClick={resetToDefaults}
            className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </button>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {previewMode ? (
        /* Preview Mode */
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
          style={{
            '--primary-color': settings.primaryColor,
            '--secondary-color': settings.secondaryColor,
            '--accent-color': settings.accentColor,
          } as React.CSSProperties}
        >
          <h3 className="text-lg font-semibold mb-4">Preview</h3>
          
          {/* Mock feedback form preview */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
            <div className="text-center">
              {settings.logo && (
                <img 
                  src={settings.logo} 
                  alt="Hospital Logo" 
                  className="h-16 mx-auto mb-4 object-contain"
                />
              )}
              
              <h1 
                className="text-2xl font-bold mb-2"
                style={{ color: settings.primaryColor }}
              >
                {settings.hospitalName || 'Hospital Name'}
              </h1>
              
              <p 
                className="text-lg mb-6"
                style={{ color: settings.secondaryColor }}
              >
                {settings.welcomeMessage}
              </p>
              
              <div className="space-y-4">
                <div 
                  className="p-4 rounded-lg text-white"
                  style={{ backgroundColor: settings.primaryColor }}
                >
                  Sample Question Button
                </div>
                
                <div 
                  className="p-2 rounded border-2"
                  style={{ borderColor: settings.accentColor }}
                >
                  Sample Input Field
                </div>
              </div>
              
              <p 
                className="text-sm mt-6"
                style={{ color: settings.secondaryColor }}
              >
                {settings.thankYouMessage}
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        /* Edit Mode */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Type className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold">Basic Information</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Hospital Name
                </label>
                <input
                  type="text"
                  value={settings.hospitalName}
                  onChange={(e) => setSettings(prev => ({ ...prev, hospitalName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter hospital name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Information
                </label>
                <textarea
                  value={settings.contactInfo || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, contactInfo: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Phone, email, address..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.sessionTimeout}
                  onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 5 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Logo Upload */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Image className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold">Logo</h3>
            </div>
            
            <div className="space-y-4">
              {settings.logo ? (
                <div className="relative">
                  <img 
                    src={settings.logo} 
                    alt="Hospital Logo" 
                    className="h-32 w-full object-contain bg-gray-50 rounded-lg border-2 border-dashed border-gray-300"
                  />
                  <button
                    onClick={removeLogo}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="text-center">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Click to upload logo</p>
                    <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                  </div>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? 'Uploading...' : settings.logo ? 'Change Logo' : 'Upload Logo'}
              </button>
            </div>
          </div>

          {/* Color Scheme */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Palette className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold">Color Scheme</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primaryColor}
                    onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.secondaryColor}
                    onChange={(e) => setSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.secondaryColor}
                    onChange={(e) => setSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#1F2937"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Accent Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(e) => setSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.accentColor}
                    onChange={(e) => setSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#10B981"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <MessageSquare className="w-5 h-5 text-blue-600 mr-2" />
              <h3 className="text-lg font-semibold">Custom Messages</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Welcome Message
                </label>
                <textarea
                  value={settings.welcomeMessage}
                  onChange={(e) => setSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Welcome message for patients"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {settings.welcomeMessage.length}/500 characters
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Thank You Message
                </label>
                <textarea
                  value={settings.thankYouMessage}
                  onChange={(e) => setSettings(prev => ({ ...prev, thankYouMessage: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Thank you message after feedback submission"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {settings.thankYouMessage.length}/500 characters
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrandingSettings;