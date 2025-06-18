import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCollageStore, type Collage } from '../../store/collageStore';
import { Image, ExternalLink, Edit, Trash2, Pencil } from 'lucide-react';
import CollageNameModal from './CollageNameModal';

const CollageList: React.FC = () => {
  const { collages, loading, error, fetchCollages, deleteCollage } = useCollageStore();
  const [selectedCollage, setSelectedCollage] = React.useState<Collage | null>(null);
  const [isRenameModalOpen, setIsRenameModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  useEffect(() => {
    fetchCollages();
  }, [fetchCollages]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this collage? This action cannot be undone.')) {
      return;
    }
    
    setIsDeleting(id);
    try {
      await deleteCollage(id);
    } catch (error) {
      console.error('Failed to delete collage:', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const handleRename = (collage: Collage, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedCollage(collage);
    setIsRenameModalOpen(true);
  };

  if (loading && collages.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/20 mx-auto"></div>
        <p className="mt-4 text-white/60">Loading your collages...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-red-400">Error loading collages. Please try again later.</p>
      </div>
    );
  }

  if (collages.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 mb-4">
          <Image className="w-6 h-6 text-white/40" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No Collages Yet</h3>
        <p className="text-white/60 mb-4">Create your first collage to get started!</p>
        <Link
          to="/dashboard/create"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors"
        >
          Create Collage
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {collages.map((collage) => (
          <div 
            key={collage.id} 
            className="relative group rounded-lg overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-colors"
          >
            <div className="p-4">
              <h3 className="text-lg font-medium text-white mb-1 truncate">{collage.name}</h3>
              <p className="text-xs text-gray-400 mb-3">
                Created: {new Date(collage.created_at || collage.createdAt).toLocaleDateString()}
                {collage.photoCount !== undefined && (
                  <> • <span>{collage.photoCount} photos</span></>
                )}
              </p>
              
              <div className="flex items-center text-sm">
                <div className="flex-1">
                  <div className="inline-flex items-center px-2 py-1 rounded bg-white/5 text-white/60 text-xs">
                    <Image className="w-3 h-3 mr-1" />
                    Code: {collage.code}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex justify-between">
                <div className="flex space-x-2">
                  <Link
                    to={`/dashboard/collage/${collage.id}`}
                    className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Link>
                  
                  <button
                    onClick={(e) => handleRename(collage, e)}
                    className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Rename
                  </button>
                </div>
                
                <div className="flex space-x-2">
                  <Link
                    to={`/collage/${collage.code}`}
                    className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    View
                  </Link>
                  
                  <button
                    onClick={(e) => handleDelete(collage.id, e)}
                    disabled={isDeleting === collage.id}
                    className="inline-flex items-center text-sm text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    {isDeleting === collage.id ? (
                      <span className="h-4 w-4 mr-1 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {selectedCollage && (
        <CollageNameModal
          collage={selectedCollage}
          isOpen={isRenameModalOpen}
          onClose={() => {
            setIsRenameModalOpen(false);
            setSelectedCollage(null);
          }}
        />
      )}
    </div>
  );
};

export default CollageList;