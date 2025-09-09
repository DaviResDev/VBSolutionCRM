import React from 'react';
import { useConnections } from '@/contexts/ConnectionsContext';
import DisconnectModal from './DisconnectModal';
import ConnectionDetailsModal from './ConnectionDetailsModal';
import DuplicateConnectionModal from './DuplicateConnectionModal';
import WhatsAppDuplicateModal from './WhatsAppDuplicateModal';
import DeleteConnectionModal from './DeleteConnectionModal';

export const ConnectionsModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    showDisconnectModal, 
    disconnectMessage, 
    closeDisconnectModal,
    showConnectionDetailsModal,
    selectedConnectionForDetails,
    closeConnectionDetailsModal,
    showDuplicateConnectionModal,
    duplicateConnectionData,
    closeDuplicateConnectionModal,
    showWhatsAppDuplicateModal,
    whatsAppDuplicateData,
    closeWhatsAppDuplicateModal,
    showDeleteConnectionModal,
    deleteConnectionData,
    closeDeleteConnectionModal,
    deleteConnection
  } = useConnections();

  return (
    <>
      {children}
      <DisconnectModal
        isOpen={showDisconnectModal}
        message={disconnectMessage}
        onClose={closeDisconnectModal}
      />
      <ConnectionDetailsModal
        isOpen={showConnectionDetailsModal}
        connection={selectedConnectionForDetails}
        onClose={closeConnectionDetailsModal}
      />
      <DuplicateConnectionModal
        isOpen={showDuplicateConnectionModal}
        data={duplicateConnectionData}
        onClose={closeDuplicateConnectionModal}
      />
      <WhatsAppDuplicateModal
        isOpen={showWhatsAppDuplicateModal}
        data={whatsAppDuplicateData}
        onClose={closeWhatsAppDuplicateModal}
      />
      <DeleteConnectionModal
        isOpen={showDeleteConnectionModal}
        connectionName={deleteConnectionData?.name || ''}
        onClose={closeDeleteConnectionModal}
        onConfirm={async () => {
          if (deleteConnectionData?.id) {
            await deleteConnection(deleteConnectionData.id);
            closeDeleteConnectionModal();
          }
        }}
      />
    </>
  );
};
