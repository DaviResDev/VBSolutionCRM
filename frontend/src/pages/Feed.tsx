
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Image, Video, Calendar, Send } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { usePosts, Comment } from '@/hooks/usePosts';
import FeedPostCard from '@/components/FeedPostCard';
import FeedPostCreator from '@/components/FeedPostCreator';

const Feed = () => {
  const { posts, loading, createPost, likePost, addComment } = usePosts();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'text' | 'image' | 'video' | 'event'>('text');

  const handleCreatePost = async (content: string, type?: 'text' | 'image' | 'video' | 'event', mediaFile?: File, eventData?: any) => {
    if (!content.trim() && !mediaFile && !eventData) {
      toast({
        title: "Conteúdo obrigatório",
        description: "Por favor, adicione conteúdo, mídia ou dados do evento",
        variant: "destructive",
      });
      return;
    }

    try {
      await createPost(content, type || 'text', mediaFile, eventData);
      toast({
        title: "Post criado",
        description: "Sua publicação foi criada com sucesso!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar a publicação",
        variant: "destructive",
      });
    }
  };

  const handleLike = async (postId: string) => {
    try {
      await likePost(postId);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao curtir a publicação",
        variant: "destructive",
      });
    }
  };

  const handleAddComment = async (postId: string, comment: Comment) => {
    try {
      await addComment(postId, comment.content);
      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi publicado!",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao adicionar comentário",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-white min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Feed Corporativo</h1>
          <p className="text-gray-600 mt-1">Compartilhe atualizações e mantenha-se conectado com a equipe</p>
        </div>
      </div>

      {/* Post Creator Component */}
      <FeedPostCreator onCreatePost={handleCreatePost} />

      {/* Posts Feed */}
      <div className="space-y-6">
        {posts.map((post) => (
          <FeedPostCard
            key={post.id}
            post={post}
            onLike={handleLike}
            onAddComment={handleAddComment}
          />
        ))}
      </div>

      {posts.length === 0 && !loading && (
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardContent className="py-16 text-center">
            <div className="text-gray-500">
              <div className="text-lg font-medium mb-2">Nenhuma publicação ainda</div>
              <p className="text-sm">Seja o primeiro a compartilhar uma atualização!</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Feed;
