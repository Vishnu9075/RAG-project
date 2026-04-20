"use client";

import React, {use, useEffect, useState} from 'react';
import { ConversationsList } from '@/components/projects/ConversationsList';
import { KnowledgeBaseSidebar } from '@/components/projects/KnowledgeBaseSidebar';
import { FileDetailsModal } from '@/components/projects/FileDetailsModal';
import { useAuth } from '@clerk/nextjs';
import { Settings } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { Project, Chat, ProjectDocument, ProjectSettings } from '@/lib/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NotFound } from '@/components/ui/NotFound';
import { title } from 'process';
import toast from 'react-hot-toast';


interface ProjectPageProps{
    params: Promise<{
        projectId: string;
    }>;
}

interface ProjectData {
    project: Project | null;
    chats: Chat[];
    documents: ProjectDocument[];
    settings: ProjectSettings | null;
}


function ProjectPage({params}: ProjectPageProps) {

    const {projectId} = use(params);
    const {getToken, userId} = useAuth();

    //data state
    const [data, setData] = useState<ProjectData>({
        project: null,
        chats: [],
        documents: [],
        settings: null,
    });
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);


    const [isCreatingChat, setIsCreatingChat] = useState(false);

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
                setError("failed to fetch data");
                toast.error("failed to fetch data");
            } finally {
                setLoading(false);
            }
        };
        loadAllData();
    }, [userId, projectId]);

    useEffect(() => {
        const hasProcessingDocuments = data.documents.some(
            (doc) =>
                doc.processing_status &&
                !["completed", "failed"].includes(doc.processing_status)
        );

        if (!hasProcessingDocuments) {
            return;
        }

        const pollInterval = setInterval(async () => {
            try {
                const token = await getToken()
                const documentsRes = await apiClient.get(
                    `/api/projects/${projectId}/files`, token
                );

                setData((prev) => ({
                    ...prev,
                    documents: documentsRes.data,
                }));
            } catch (err) {
                console.error("polling error: ", err);
            }
        }, 2000);

        return () => clearInterval(pollInterval);
    }, [data.documents, projectId, getToken]);


  //chat related methods

  const handleCreateNewchat = async () => {
    if (!userId) return 

    try {
        setIsCreatingChat(true);

        const token = await getToken()

        const chatNumber = Date.now() % 10000;

        const result = await apiClient.post("/api/chats", {
            title : `chat #${chatNumber}`,
            project_id: projectId
        }, token)

        const savedChat = result.data

        // update local state

        setData((prev) => ({
            ...prev,
            chats:[savedChat, ...prev.chats]
        }));

        toast.success("chat create successfully")
    } catch (err){
        toast.error("failed to create chat");
    } finally {
        setIsCreatingChat(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!userId) return

    try {
        const token = await getToken()

        await apiClient.delete(`/api/chats/${chatId}`, token)

        // update local state

        setData((prev) => ({
            ...prev,
            chats: prev.chats.filter((chat) => chat.id !== chatId)
        }));

        toast.success("chat delete successfully")
    } catch (err) {
        toast.error("Failed to delete chat")
    }
  };

  const handleChatClick = (chatId: string) => {
    console.log("navigate to chat: ", chatId);
  };

  // document releated methods

  const handleDocumentUpload = async (files: File[]) => {
    if (!userId) return;

    const token = await getToken();
    const uploadedDocuments : ProjectDocument[] = [];

    // process all files in parallel

    const uploadPromises = files.map(async (file) => {
        try {

            // step 1 get presigned url
            const uploadData = await apiClient.post(
                `/api/projects/${projectId}/files/upload_url`,
                {
                    filename: file.name,
                    file_size: file.size,
                    file_type: file.type
                },
                token
            );

            const { upload_url, s3_key } = uploadData.data;

            //step 2 upload file to s3
            await apiClient.uploadToS3(upload_url, file)

            // step 3 confirm the upload to server (starts background processing)
            
            const updatedDocument = await apiClient.post(
                `/api/projects/${projectId}/files/confirm`,
                {
                    s3_key,
                },
                token,
            );

            uploadedDocuments.push(updatedDocument.data);

        } catch (err) {
            toast.error(`failed to upload ${file.name}`);
        }
    })

    await Promise.allSettled(uploadPromises);

    //upload local state with successfully uploaded document

    if (uploadedDocuments.length > 0) {
        setData((prev) => ({
            ...prev,
            documents: [...uploadedDocuments, ...prev.documents],
        }));

        toast.success(`${uploadedDocuments.length} file(s) uploaded`);
    }
  };

  const handleDocumentDelete = async (documentId: string) => {
    if (!userId) return;

    try {
        const token = await getToken()

        await apiClient.delete(
            `/api/projects/${projectId}/files/${documentId}`, token
        );

        // update local state

        setData((prev) => ({
            ...prev,
            documents: prev.documents.filter((doc) => doc.id !== documentId),
        }));


        toast.success("Document deleted successfully")
    } catch (err) {
        toast.error("Docuemnt deletion failed");
    }
  };

  const handleUrlAdd = async (url: string) =>{

    if (!userId) return;

    try {
        const token = await getToken();

        const result = await apiClient.post(
            `/api/projects/${projectId}/urls`,
            {
                url,
            },
            token,
        );

        const newDocument = result.data;

        //update local state
        setData((prev) => ({
            ...prev,
            documents: [newDocument, ...prev.documents]
        }));

        toast.success("website added successfully")

        console.log(result);
    } catch (err) {
        toast.error("failed to add website")
    }
  };

  const handleOpenDocument = (documentId: string) => {
    console.log("open document", documentId);
    setSelectedDocumentId(documentId);
  };

  // project settings related methods

  const handleDraftSettings = (updates: any) =>{

    setData((prev) => {
        // if no settings exist yet , we cant update them
        if (!prev.settings) {
            console.warn("Cannot update settings: not loaded yet")
            return prev
        }

        // merge the updates into existing settings

        return {
            ...prev,
            settings: {
                ...prev.settings,
                ...updates,
            }
        }
    })
  };

  const handlePublishSettings = async ()=> {
    if (!userId || !data.settings) {
        toast.error("cannot save settings")
    }

    try {
        const token = await getToken()

        const result = await apiClient.put(`/api/projects/${projectId}/settings`, data.settings, token)

        setData((prev) => ({
            ...prev,
            settings: result.data
        }))

        toast.success("settings saved successfully")
    } catch (err) {
        toast.error("failed to save settings")
    }
  };

  if (loading) {
    return <LoadingSpinner message='Loading project...' />
  }

  if (!data.project) {
    return <NotFound message='Project not found' />
  }

  const selectedDocument = selectedDocumentId
    ? data.documents.find((doc) => doc.id == selectedDocumentId)
    : null;

  return (
    <>
    <div>
        <div className="flex h-screen bg-[#0d1117] gap-4 p-4">
            <ConversationsList
                project= {data.project}
                conversations={data.chats}
                error={error}
                loading={isCreatingChat}
                onCreateNewChat={handleCreateNewchat}
                onChatClick={handleChatClick}
                onDeleteChat={handleDeleteChat}
            />
            
            <KnowledgeBaseSidebar
                activeTab= {activeTab}
                onSetActiveTab = {setActiveTab}
                projectDocuments = {data.documents}
                onDocumentUpload = {handleDocumentUpload}
                onDocumentDelete = {handleDocumentDelete}
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