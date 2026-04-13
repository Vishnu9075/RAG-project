"use client";

import React, {use, useEffect, useState} from 'react';
import { ConversationsList } from '@/components/projects/ConversationsList';
import { KnowledgeBaseSidebar } from '@/components/projects/KnowledgeBaseSidebar';
import { FileDetailsModal } from '@/components/projects/FileDetailsModal';
import { useAuth } from '@clerk/nextjs';
import { Settings } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NotFound } from '@/components/ui/NotFound';


interface ProjectPageProps{
    params: Promise<{
        projectId: string;
    }>;
}


function ProjectPage({params}: ProjectPageProps) {

    const {projectId} = use(params);
    const {getToken, userId} = useAuth();

    //data state
    const [data, setData] = useState({
        project : null,
        chats : [],
        documents : [],
        settings : null
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [activeTab, setActiveTab] = useState<"documents" | "settings">("documents");

    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null >(null);


    useEffect (() => {

        const loadAllData = async () => {
            if (!userId) return

            try {

                setLoading(true);
                setError(null);

                const token = await getToken();

                const [projectRes, chatsRes, documentsRes, settingsRes] = await Promise.all([
                    apiClient.get(`/api/projects/${projectId}`, token),
                    apiClient.get(`/api/projects/${projectId}/chats`, token),
                    apiClient.get(`/api/projects/${projectId}/files`, token),
                    apiClient.get(`/api/projects/${projectId}/settings`, token),
                ]);


                setData ({
                    project: projectRes.data,
                    chats: chatsRes.data,
                    documents: documentsRes.data,
                    settings: settingsRes.data,
                });
            } catch (err) {

            } finally {
                setLoading(false);
            }
        };
        loadAllData();
    }, [userId, projectId]);


  //chat related methods

  const handleCreateNewchat = async () => {
    console.log("create new chat")
  };

  const handleDeleteChat = async (chatId: string) => {
    console.log("chat deleted");
  };

  const handleChatClick = (chatId: string) => {
    console.log("navigate to chat: ", chatId);
  };

  // document releated methods

  const handleDocumentUpload = async (files: File[]) => {
    console.log("upload files", files);
  };

  const handleDocumentDelete = async (documentId: string) => {
    console.log("Document Deleted");
  };

  const handleUrlAdd = async (url: string) =>{
    console.log("Add URl:", url);
  };

  const handleOpenDocument = (documentId: string) => {
    console.log("open document", documentId);
    setSelectedDocumentId(documentId);
  };

  // project settings related methods

  const handleDraftSettings = (updates: any) =>{
    console.log("update local state with draft settings", updates);
  };

  const handlePublishSettings = async ()=> {
    console.log("make API call to update settings");
  };

  if (loading) {
    return <LoadingSpinner message='Loading project...' />
  }

  if (!data.project) {
    return <NotFound message='Project not found' />
  }

  const selectedDocument = selectedDocumentId ? data.documents.find(doc => doc.id == selectedDocumentId) : null

  return (
    <>
    <div>
        <div className="flex h-screen bg-[#0d1117] gap-4 p-4">
            <ConversationsList
                project= {data.project}
                conversations={data.chats}
                error={null}
                loading={false}
                onCreateNewChat={handleCreateNewchat}
                onChatClick={handleChatClick}
                onDeleteChat={handleChatClick}
            />
            
            <KnowledgeBaseSidebar
                activeTab= {activeTab}
                onSetActiveTab = {setActiveTab}
                projectDocuments = {data.documents}
                onDocumentUpload = {handleDocumentUpload}
                onDocumentDelete = {handleDeleteChat}
                onOpenDocument = {handleOpenDocument}
                onUrlAdd = {handleUrlAdd}
                projectSettings = {data.settings}
                settingsError = {null}
                settingsLoading= {false}
                onUpdateSettings = {handleDraftSettings}
                onApplySettings = {handlePublishSettings}
            />
        </div>
    </div>
    {selectedDocument && (
        <FileDetailsModal
        document={selectedDocument}
        onClose={() => setSelectedDocumentId(null)}
    />
    )};
    </>
  );
}

export default ProjectPage;