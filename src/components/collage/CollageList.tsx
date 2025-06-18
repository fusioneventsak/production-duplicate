import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCollageStore } from '../../store/collageStore';
import { Image, ExternalLink, Edit, Trash2, Pencil } from 'lucide-react';
import CollageNameModal from './CollageNameModal';

const CollageList: React.FC = () => {
  const { collages, loading, error, fetchCollages, deleteCollage } = useCollageStore();
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  const [selectedCollage, setSelectedCollage] = React.useState<any>(null);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);

  useEffect(() => {
    fetchCollages();
  }, [fetchCollages]);

  const handleEditClick = (collage: any) => {
    setSelectedCollage(collage);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = async (collageId: string) => {
    if (window.confirm('Are you sure you want to delete this collage? This action cannot be undone.')) {
      setIsDeleting(collageId);
      try {
        await deleteCollage(collageId);
      } catch (error) {
        console.error('Failed to delete collage:', error);
      } finally {
        setIsDeleting(null);
      }
    }
  };

  if (loading && collages.length === 0) {
    return (
      <div className="p-6 text-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-gray-400">Loading your collages...</p>
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
        <Image className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-400">No collages yet. Create your first one!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {collages.map((collage) => (
        <div key={collage.id} className="bg-gray-800 rounded-lg overflow-hidden shadow-lg">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-white mb-2">{collage.name}</h3>
            <p className="text-sm text-gray-400 mb-2">
              {collage.photoCount} photos • Created {new Date(collage.createdAt).toLocaleDateString()}
            </p>
            
            <div className="mt-4 flex justify-between">
              <Link
                to={`/dashboard/collage/${collage.id}`}
                className="inline-flex items-center text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Link>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleEditClick(collage)}
                  className="inline-flex items-center text-sm text-amber-400 hover:text-amber-300 transition-colors"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Rename
                </button>
                
                <Link
                  to={`/collage/${collage.code}`}
                  className="inline-flex items-center text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
                </Link>
                
                <button
                  onClick={() => handleDeleteClick(collage.id)}
                  disabled={isDeleting === collage.id}
                  className="inline-flex items-center text-sm text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                >
                  {isDeleting === collage.id ? (
                    <div className="h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin mr-1" />
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
      
      {/* Edit Collage Name Modal */}
      {isEditModalOpen && selectedCollage && (
        <CollageNameModal
          collage={selectedCollage}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedCollage(null);
          }}
        />
      )}
    </div>
  );
};

export default CollageList;