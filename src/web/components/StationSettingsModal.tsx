import { useState } from 'react';
import { X, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface StationSettings {
  // Station Identity
  station_name: string;
  station_call_sign: string;
  country: string;
  city_region: string;
  broadcast_type: string;
  primary_language: string;

  // Broadcast Preferences
  audio_format: string;
  bitrate: string;
  loudness_standard: string;
  is_stereo: boolean;
  file_naming_preference: string;
  time_zone: string;
  air_days: string[];
  air_time_start: string;
  air_time_end: string;
  is_live: boolean;
  usage_type: string;

  // Branding & Assets
  logo_dark_url: string;
  logo_light_url: string;
  station_tagline: string;
  voice_style: string;
  pronunciation_notes: string;

  // Contacts
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_role: string;
  billing_contact_name: string;
  billing_contact_email: string;

  // Licensing
  license_confirmed: boolean;
  station_website: string;
}

interface StationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StationSettingsModal({ isOpen, onClose }: StationSettingsModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'identity' | 'preferences' | 'branding' | 'contacts' | 'licensing'>('identity');
  const [settings, setSettings] = useState<Partial<StationSettings>>({
    station_name: '',
    primary_language: 'English',
    broadcast_type: 'Online Radio',
    loudness_standard: '-16 LUFS',
    is_stereo: true,
    is_live: false,
    usage_type: 'full_episode_only',
    primary_contact_name: '',
    primary_contact_email: user?.email || '',
    license_confirmed: false,
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleInputChange = (field: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveSection = async () => {
    setLoading(true);
    try {
      // TODO: Call API endpoint
      console.log('Saving section:', activeTab, settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { id: 'identity', label: 'Station Identity', icon: '🏢' },
    { id: 'preferences', label: 'Broadcast Preferences', icon: '🎙️' },
    { id: 'branding', label: 'Branding & Assets', icon: '🎨' },
    { id: 'contacts', label: 'Contacts', icon: '👥' },
    { id: 'licensing', label: 'Licensing', icon: '⚖️' },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-white/10 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Settings className="text-[#d4a843]" size={24} />
            <h2 className="text-xl font-heading text-white">Station Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-white/60" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Tabs Sidebar */}
          <div className="w-48 border-r border-white/10 bg-white/5 overflow-y-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left px-4 py-3 transition-colors border-l-2 ${
                  activeTab === tab.id
                    ? 'bg-[#d4a843]/10 border-l-[#d4a843] text-white'
                    : 'border-l-transparent text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{tab.icon}</span>
                  <span className="text-sm font-medium">{tab.label}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'identity' && (
              <div className="space-y-4 max-w-2xl">
                <h3 className="text-lg font-heading text-white mb-6">Station Identity</h3>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Station Name *
                  </label>
                  <input
                    type="text"
                    value={settings.station_name || ''}
                    onChange={(e) => handleInputChange('station_name', e.target.value)}
                    placeholder="e.g., Zero Point Zero"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-[#d4a843] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Station Call Sign
                  </label>
                  <input
                    type="text"
                    value={settings.station_call_sign || ''}
                    onChange={(e) => handleInputChange('station_call_sign', e.target.value)}
                    placeholder="e.g., WXYZ"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-[#d4a843] focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Country *
                    </label>
                    <input
                      type="text"
                      value={settings.country || ''}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="e.g., United States"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-[#d4a843] focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      City / Region *
                    </label>
                    <input
                      type="text"
                      value={settings.city_region || ''}
                      onChange={(e) => handleInputChange('city_region', e.target.value)}
                      placeholder="e.g., Austin, TX"
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-[#d4a843] focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Broadcast Type
                    </label>
                    <select
                      value={settings.broadcast_type || ''}
                      onChange={(e) => handleInputChange('broadcast_type', e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#d4a843] focus:outline-none transition-colors"
                    >
                      <option value="Online Radio">Online Radio</option>
                      <option value="FM">FM</option>
                      <option value="AM">AM</option>
                      <option value="Community">Community</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Primary Language *
                    </label>
                    <select
                      value={settings.primary_language || ''}
                      onChange={(e) => handleInputChange('primary_language', e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#d4a843] focus:outline-none transition-colors"
                    >
                      <option value="English">English</option>
                      <option value="Portuguese">Portuguese</option>
                      <option value="Spanish">Spanish</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-4 max-w-2xl">
                <h3 className="text-lg font-heading text-white mb-6">Broadcast Preferences</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Audio Format
                    </label>
                    <select
                      value={settings.audio_format || ''}
                      onChange={(e) => handleInputChange('audio_format', e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#d4a843] focus:outline-none transition-colors"
                    >
                      <option value="">Select format</option>
                      <option value="WAV">WAV</option>
                      <option value="MP3">MP3</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/80 mb-2">
                      Bitrate
                    </label>
                    <select
                      value={settings.bitrate || ''}
                      onChange={(e) => handleInputChange('bitrate', e.target.value)}
                      className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#d4a843] focus:outline-none transition-colors"
                    >
                      <option value="">Select bitrate</option>
                      <option value="128">128 kbps</option>
                      <option value="192">192 kbps</option>
                      <option value="256">256 kbps</option>
                      <option value="320">320 kbps</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Loudness Standard
                  </label>
                  <select
                    value={settings.loudness_standard || ''}
                    onChange={(e) => handleInputChange('loudness_standard', e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#d4a843] focus:outline-none transition-colors"
                  >
                    <option value="-16 LUFS">-16 LUFS (default)</option>
                    <option value="-14 LUFS">-14 LUFS</option>
                  </select>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.is_stereo || false}
                      onChange={(e) => handleInputChange('is_stereo', e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5"
                    />
                    <span className="text-sm text-white/80">Stereo</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={settings.is_live || false}
                      onChange={(e) => handleInputChange('is_live', e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5"
                    />
                    <span className="text-sm text-white/80">Live Broadcast</span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Time Zone
                  </label>
                  <input
                    type="text"
                    value={settings.time_zone || ''}
                    onChange={(e) => handleInputChange('time_zone', e.target.value)}
                    placeholder="e.g., CST, EST, PST"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-[#d4a843] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {activeTab === 'branding' && (
              <div className="space-y-4 max-w-2xl">
                <h3 className="text-lg font-heading text-white mb-6">Branding & Assets</h3>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Station Tagline
                  </label>
                  <input
                    type="text"
                    value={settings.station_tagline || ''}
                    onChange={(e) => handleInputChange('station_tagline', e.target.value)}
                    placeholder="e.g., The Future of Electronic Music"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-[#d4a843] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Preferred Voice Style
                  </label>
                  <select
                    value={settings.voice_style || ''}
                    onChange={(e) => handleInputChange('voice_style', e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#d4a843] focus:outline-none transition-colors"
                  >
                    <option value="">Select style</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Energetic">Energetic</option>
                    <option value="Smooth">Smooth</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Pronunciation Notes
                  </label>
                  <textarea
                    value={settings.pronunciation_notes || ''}
                    onChange={(e) => handleInputChange('pronunciation_notes', e.target.value)}
                    placeholder="Add any special pronunciation notes for station ID..."
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-[#d4a843] focus:outline-none transition-colors h-24 resize-none"
                  />
                </div>
              </div>
            )}

            {activeTab === 'contacts' && (
              <div className="space-y-4 max-w-2xl">
                <h3 className="text-lg font-heading text-white mb-6">Contacts</h3>
                
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Primary Contact Name *
                  </label>
                  <input
                    type="text"
                    value={settings.primary_contact_name || ''}
                    onChange={(e) => handleInputChange('primary_contact_name', e.target.value)}
                    placeholder="e.g., John Smith"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-[#d4a843] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Primary Contact Email *
                  </label>
                  <input
                    type="email"
                    value={settings.primary_contact_email || ''}
                    onChange={(e) => handleInputChange('primary_contact_email', e.target.value)}
                    placeholder="john@station.com"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-[#d4a843] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Role
                  </label>
                  <select
                    value={settings.primary_contact_role || ''}
                    onChange={(e) => handleInputChange('primary_contact_role', e.target.value)}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:border-[#d4a843] focus:outline-none transition-colors"
                  >
                    <option value="">Select role</option>
                    <option value="Program Director">Program Director</option>
                    <option value="Station Manager">Station Manager</option>
                    <option value="Producer">Producer</option>
                  </select>
                </div>

                <hr className="border-white/10 my-6" />

                <h4 className="font-medium text-white mb-4">Billing Contact (Optional)</h4>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Billing Contact Name
                  </label>
                  <input
                    type="text"
                    value={settings.billing_contact_name || ''}
                    onChange={(e) => handleInputChange('billing_contact_name', e.target.value)}
                    placeholder="e.g., Jane Doe"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-[#d4a843] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Billing Contact Email
                  </label>
                  <input
                    type="email"
                    value={settings.billing_contact_email || ''}
                    onChange={(e) => handleInputChange('billing_contact_email', e.target.value)}
                    placeholder="jane@station.com"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-[#d4a843] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {activeTab === 'licensing' && (
              <div className="space-y-4 max-w-2xl">
                <h3 className="text-lg font-heading text-white mb-6">Licensing & Compliance</h3>
                
                <div className="bg-[#d4a843]/10 border border-[#d4a843]/20 rounded-lg p-4 mb-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.license_confirmed || false}
                      onChange={(e) => handleInputChange('license_confirmed', e.target.checked)}
                      className="w-5 h-5 rounded border-[#d4a843]/30 bg-white/5 mt-1"
                    />
                    <span className="text-sm text-white/80">
                      I confirm that this station holds the rights to broadcast licensed content and understands all terms of service.
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Station Website or Stream URL
                  </label>
                  <input
                    type="url"
                    value={settings.station_website || ''}
                    onChange={(e) => handleInputChange('station_website', e.target.value)}
                    placeholder="https://yourstation.com"
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:border-[#d4a843] focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 p-6 flex justify-between items-center bg-white/5">
          <p className="text-xs text-white/50">
            Last updated: {new Date().toLocaleDateString()}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-white/80 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveSection}
              disabled={loading}
              className="px-6 py-2 bg-[#d4a843] text-[#0a0a0a] font-semibold rounded-lg hover:bg-[#e8c574] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
          {success && (
            <p className="text-sm text-green-400">✓ Saved successfully</p>
          )}
        </div>
      </div>
    </div>
  );
}
