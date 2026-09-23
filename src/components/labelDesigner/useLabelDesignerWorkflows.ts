import { useState, useCallback, useEffect } from 'react';
import { ElementData, PageConfig } from './types';
import { storageApi, filesApi } from '../../services/supabaseApi';
import { supabase } from '../../services/supabase';

export interface WorkflowItem {
  id: string;
  name: string;
  elements: ElementData[];
  config?: PageConfig;
  createdAt?: number;
}

export function useLabelDesignerWorkflows(
  elements: ElementData[],
  setElements: React.Dispatch<React.SetStateAction<ElementData[]>>,
  pageConfig: PageConfig,
  setPageConfig: React.Dispatch<React.SetStateAction<PageConfig>>
) {
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [workflowName, setWorkflowName] = useState('');

  const loadWorkflowsList = useCallback(async () => {
    try {
      const { data } = await filesApi.getAll();
      const workflowFiles = data?.filter((f: any) => f.metadata?.category === 'label-designer') || [];

      const loadedWorkflows = await Promise.all(
        workflowFiles.map(async (file: any) => {
          try {
            const response = await fetch(file.url);
            if (!response.ok) return null;
            return await response.json();
          } catch {
            return null;
          }
        })
      );

      setWorkflows(loadedWorkflows.filter((w): w is WorkflowItem => Boolean(w && w.id && w.name)));
    } catch (error) {
      console.error('Failed to load workflows:', error);
    }
  }, []);

  useEffect(() => {
    loadWorkflowsList();
  }, [loadWorkflowsList]);

  const saveWorkflow = useCallback(async () => {
    if (!(workflowName || '').trim()) return;

    const workflow: WorkflowItem = {
      id: currentWorkflowId || `wf_${Date.now()}`,
      name: workflowName,
      elements,
      config: pageConfig,
      createdAt: Date.now()
    };

    try {
      // Save to cloud storage
      const blob = new Blob([JSON.stringify(workflow)], { type: 'application/json' });
      const file = new File([blob], `${workflow.name}.json`, { type: 'application/json' });
      const path = `label-designer/${workflow.id}.json`;

      await storageApi.upload('files', path, file);
      const url = storageApi.getPublicUrl('files', path);

      // Upsert: update existing record or create new
      const { data: existing } = await filesApi.getAll();
      const existingFile = existing?.find((f: any) => f.metadata?.workflowId === workflow.id);
      if (existingFile) {
        await supabase
          .from('files')
          .update({
            name: workflow.name,
            url,
            size: blob.size,
            metadata: { category: 'label-designer', workflowId: workflow.id }
          })
          .eq('id', existingFile.id);
      } else {
        await filesApi.create({
          name: workflow.name,
          type: 'workflow',
          url,
          size: blob.size,
          metadata: { category: 'label-designer', workflowId: workflow.id }
        });
      }

      setWorkflows(prev => {
        const existingIdx = prev.findIndex(w => w.id === workflow.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = workflow;
          return updated;
        }
        return [...prev, workflow];
      });

      setCurrentWorkflowId(workflow.id);
      setIsWorkflowModalOpen(false);
      setWorkflowName('');
    } catch (error) {
      console.error('Failed to save workflow:', error);
      alert('Lỗi khi lưu workflow');
    }
  }, [workflowName, elements, pageConfig, currentWorkflowId]);

  const loadWorkflow = useCallback(
    async (workflowId: string) => {
      try {
        const { data } = await filesApi.getAll();
        const file = data?.find((f: any) => f.metadata?.workflowId === workflowId);
        if (!file) return;

        const response = await fetch(file.url);
        const workflow = await response.json();

        setElements(workflow.elements || []);
        if (workflow.config) setPageConfig(workflow.config);
        setCurrentWorkflowId(workflow.id);
        setWorkflowName(workflow.name || '');
        setIsWorkflowModalOpen(false);
      } catch (error) {
        console.error('Failed to load workflow:', error);
        alert('Lỗi khi tải workflow');
      }
    },
    [setElements, setPageConfig]
  );

  const deleteWorkflow = useCallback(
    async (workflowId: string) => {
      if (!window.confirm('Xóa workflow này?')) return;

      try {
        const { data } = await filesApi.getAll();
        const file = data?.find((f: any) => f.metadata?.workflowId === workflowId);
        if (file) {
          await filesApi.delete(file.id);
          await storageApi.delete('files', `label-designer/${workflowId}.json`);
        }

        setWorkflows(prev => prev.filter(w => w.id !== workflowId));
        if (currentWorkflowId === workflowId) {
          setCurrentWorkflowId(null);
          setWorkflowName('');
        }
      } catch (error) {
        console.error('Failed to delete workflow:', error);
        alert('Lỗi khi xóa workflow');
      }
    },
    [currentWorkflowId]
  );

  return {
    workflows,
    currentWorkflowId,
    setCurrentWorkflowId,
    workflowName,
    setWorkflowName,
    isWorkflowModalOpen,
    setIsWorkflowModalOpen,
    saveWorkflow,
    loadWorkflow,
    deleteWorkflow,
    loadWorkflowsList
  };
}
