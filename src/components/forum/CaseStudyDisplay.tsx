import { MapPin, Home, Lightbulb, Search, BookOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ForumPost } from '@/lib/forum';

interface CaseStudyDisplayProps {
  post: ForumPost;
}

export function CaseStudyDisplay({ post }: CaseStudyDisplayProps) {
  const sections = [
    {
      icon: Search,
      title: 'The Situation',
      content: post.case_study_situation,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      icon: Lightbulb,
      title: 'What I Found',
      content: post.case_study_findings,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      icon: BookOpen,
      title: 'Lessons Learned',
      content: post.case_study_lessons,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
  ];

  return (
    <div className="space-y-3 mb-4">
      {/* Property info bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {post.case_study_property_type && (
          <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-indigo-50 gap-1">
            <Home size={12} />
            {post.case_study_property_type}
          </Badge>
        )}
        {post.case_study_location && (
          <Badge variant="outline" className="border-gray-300 text-gray-700 gap-1">
            <MapPin size={12} />
            {post.case_study_location}
          </Badge>
        )}
      </div>

      {/* Structured sections */}
      {sections.map((section) =>
        section.content ? (
          <Card key={section.title} className={`border-l-4 ${section.bg}`} style={{ borderLeftColor: 'currentColor' }}>
            <CardContent className="p-4">
              <div className={`flex items-center gap-2 mb-2 font-semibold text-sm ${section.color}`}>
                <section.icon size={16} />
                {section.title}
              </div>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {section.content}
              </p>
            </CardContent>
          </Card>
        ) : null
      )}
    </div>
  );
}
