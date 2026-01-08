import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserCheck, Loader2 } from 'lucide-react';

export function ApplyForProfessionalButton() {
  const { user, profile, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');

  // Only show for guests
  if (!profile || profile.role !== 'guest') {
    return null;
  }

  const handleSubmit = async () => {
    if (!user) {
      toast.error('You must be signed in to apply');
      return;
    }

    if (!applicationMessage.trim()) {
      toast.error('Please provide a brief message about your professional experience');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          role: 'pending_professional',
          approval_status: 'pending',
          application_date: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      await refreshProfile();

      toast.success('Application submitted successfully!');
      toast.info('An administrator will review your application shortly');
      setOpen(false);
      setApplicationMessage('');
    } catch (error: any) {
      console.error('Application error:', error);
      toast.error(error.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <UserCheck size={16} />
          Apply for Professional Status
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply for Professional Status</DialogTitle>
          <DialogDescription>
            Submit an application to become a verified professional on the platform.
            This will give you access to submit properties, post inspection requests, and more.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="application_message">
              Tell us about your professional experience
            </Label>
            <Textarea
              id="application_message"
              value={applicationMessage}
              onChange={(e) => setApplicationMessage(e.target.value)}
              placeholder="I am a licensed real estate agent with 5 years of experience in..."
              rows={5}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Your current user type: {profile.user_type?.replace('_', ' ')}
            </p>
          </div>

          <div className="bg-muted p-4 rounded-md text-sm">
            <p className="font-medium mb-2">What happens next:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Your application will be reviewed by an administrator</li>
              <li>You'll be notified once your application is approved</li>
              <li>After approval, you'll have full access to platform features</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
