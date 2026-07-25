export interface Category {
  id: string;
  name: string;
  sort_order: number;
  created_at: number;
}

export type SnippetType = "text" | "file";
export type FileType = string | null;

export interface Snippet {
  id: string;
  title: string;
  type: SnippetType;
  content: string;
  file_path: string | null;
  file_type: FileType;
  category_id: string;
  remark: string;
  created_at: number;
  updated_at: number;
}

export interface SnippetCreateInput {
  title: string;
  type: SnippetType;
  content?: string;
  file_path?: string;
  file_type?: FileType;
  category_id: string;
  remark?: string;
}

export interface SnippetUpdateInput extends Partial<SnippetCreateInput> {}
