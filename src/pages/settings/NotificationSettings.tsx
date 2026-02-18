import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Bell, Mail } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import {
  ForumEmailPreferences,
  fetchEmailPreferences,
  upsertEmailPreferences,
} from '@/lib/forum';
import { toast } from 'sonner';

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [prefs, setPrefs] = useState<ForumEmailPreferences>({
    user_id: '',
    digest_frequency: 'weekly',
    notify_replies: true,
    notify_mentions: true,
    notify_follows: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) loadPrefs();
  }, [user]);

  const loadPrefs = async () => {
    if (!user) return;
    setLoading(true);
    const existing = await fetchEmailPreferences(user.id);
    if (existing) {
      setPrefs(existing);
    } else {
      setPrefs((p) => ({ ...p, user_id: user.id }));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const success = await upsertEmailPreferences(user.id, {
      digest_frequency: prefs.digest_frequency,
      notify_replies: prefs.notify_replies,
      notify_mentions: prefs.notify_mentions,
      notify_follows: prefs.notify_follows,
    });
    if (success) {
      toast.success('Notification preferences saved');
    } else {
      toast.error('Failed to save preferences');
    }
    setSaving(false);
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Bell size={22} className="text-forest" />
              Notification Settings
            </h1>
            <p className="text-sm text-muted-foreground">Manage how you receive forum notifications</p>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Mail size={18} className="text-forest" />
              Email Digest
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Digest Frequency</Label>
                <p className="text-xs text-muted-foreground">How often to receive a summary of forum activity</p>
              </div>
              <Select
                value={prefs.digest_frequency}
                onValueChange={(v) => setPrefs({ ...prefs, digest_frequency: v as any })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell size={18} className="text-forest" />
              Forum Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Replies to my posts</Label>
                <p className="text-xs text-muted-foreground">Email me when someone replies to my posts</p>
              </div>
              <Switch
                checked={prefs.notify_replies}
                onCheckedChange={(v) => setPrefs({ ...prefs, notify_replies: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Mentions</Label>
                <p className="text-xs text-muted-foreground">Email me when I'm mentioned in a post or reply</p>
              </div>
              <Switch
                checked={prefs.notify_mentions}
                onCheckedChange={(v) => setPrefs({ ...prefs, notify_mentions: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Followed posts</Label>
                <p className="text-xs text-muted-foreground">Email me about new activity on posts I follow</p>
              </div>
              <Switch
                checked={prefs.notify_follows}
                onCheckedChange={(v) => setPrefs({ ...prefs, notify_follows: v })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="bg-forest hover:bg-forest/90"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
