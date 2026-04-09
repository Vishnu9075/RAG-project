"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs'; 
import { useRouter } from 'next/navigation';

import { ProjectsGrid } from '@/src/components/projects/ProjectsGrid';
import { CreateProjectModal } from '@/src/components/projects/CreateProjectModal';
import { LoadingSpinner } from '@/src/components/ui/LoadingSpinner';
import toast from "react-hot-toast";
import { apiClient } from '@/src/lib/api';

interface Project {
  id : string;
  name: string;
  description: string;
  created_at: string;
  clerk_id: string;
}


function ProjectsPage() {

  // data state

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Model state

  const [showCreateModel, setShowCreateModel] = useState(false);
  const [isCreating, setIsCreating] = useState(false);


  const { getToken, userId } = useAuth();
  const router = useRouter();

  //business logic functions

  const loadProjects = async () => {
    try {
      setLoading(true);

      const token = await getToken();

      const result = await apiClient.get("/api/projects", token);

      const { data } = result || {};

      console.log(data, "projectList");


      setProjects(data);
    } catch (err) {
      console.error("Error Loading Projects", err);
      toast.error("Failed to create project");
    } finally {
      setLoading(false);
    }
  };


  const handleCreateProject = async (name: string, description: string) => {
    try {
      setError(null);
      setIsCreating(true);

      const token = await getToken();

      const result = await apiClient.post(
        "/api/projects",
        {
          name,
          description,
        },
        token
      );

      const savedProject = result?.data || {};
      setProjects((prev) => [savedProject, ...prev]);

      setShowCreateModel(false);
      toast.success("Project created successfully!");
    } catch (err) {
      toast.error("Failed to create project");
      console.error("Failed to create project", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const token = await getToken();

      await apiClient.delete(`/api/projects/${projectId}`, token);

      setProjects((prev) => prev.filter((project) => project.id !== projectId));

      toast.success("project deleted successfully")

    } catch (err) {
      toast.error("Failed to delete project");
      console.error("Failed to delete project", err);
    }
  };

  const handleProjectClick = async (projectId: string) =>{
    router.push(`/projects/${projectId}`)
  };

  const handleOpenModel = () => {
    setShowCreateModel(true)
  };
  
  const handleCloseModel = () => {
    setShowCreateModel(false)
  };


  useEffect(()=> {
    if (userId) {
      loadProjects();
    }

  }, [userId])


  const filteredProjects = projects.filter(
    (project) => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner message='Loading projects...'/>
  }

  return (
    <div>
      <ProjectsGrid
      projects = {filteredProjects}
      loading = {loading}
      error = {error}
      searchQuery = {searchQuery}
      onSearchChange={setSearchQuery}
      viewMode ={viewMode}
      onViewModeChange={setViewMode}
      onProjectClick={handleProjectClick}
      onCreateProject={handleOpenModel}
      onDeleteProject={handleDeleteProject}
      />
      <CreateProjectModal
        isOpen= {showCreateModel}
        onClose = {handleCloseModel}
        onCreateProject= {handleCreateProject}
        isLoading= {isCreating}
      />
    </div>
  );
}

export default ProjectsPage
