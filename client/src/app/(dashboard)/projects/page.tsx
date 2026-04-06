"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs'; 
import { useRouter } from 'next/navigation';

import { ProjectsGrid } from '@/src/components/projects/ProjectsGrid';
import { CreateProjectModal } from '@/src/components/projects/CreateProjectModal';
import { LoadingSpinner } from '@/src/components/ui/LoadingSpinner';
import toast from "react-hot-toast";


function ProjectsPage() {

  // data state

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // UI state

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  
  // Model state

  const [showCreateModel, setShowCreateModel] = useState(false);
  const [isCreating, setIsCreating] = useState(false);


  const { getToken, userId } = useAuth();
  const router = useRouter();

  //business logic functions

  const loadProject = async () => {};

  const createProject = async (name: string, description: string) => {}

  const handleDeleteProject = async (projectId: string) => {}

  const handleProjectClick = async (projectId: string) =>{
    router.push(`/projects/${projectId}`)
  }

  const handleOpenModel = () => {
    setShowCreateModel(true)
  }


  return 
    <div>
    
    </div>
}

export default ProjectsPage
