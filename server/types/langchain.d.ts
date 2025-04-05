declare module 'langchain/embeddings/openai' {
  export class OpenAIEmbeddings {
    constructor(options?: any);
    embedDocuments(texts: string[]): Promise<number[][]>;
    embedQuery(text: string): Promise<number[]>;
  }
}

declare module 'langchain/text_splitter' {
  export interface TextSplitterParams {
    chunkSize?: number;
    chunkOverlap?: number;
    separator?: string;
  }

  export class RecursiveCharacterTextSplitter {
    constructor(options?: TextSplitterParams);
    splitText(text: string): Promise<string[]>;
  }
}

declare module 'langchain/document' {
  export class Document {
    pageContent: string;
    metadata: Record<string, any>;
    constructor(fields: {
      pageContent: string;
      metadata?: Record<string, any>;
    });
  }
}

declare module 'langchain/vectorstores/faiss' {
  import { Document } from 'langchain/document';
  
  export interface FaissStoreOptions {
    docstore?: any;
    index?: any;
    embeddings?: any;
    mapping?: Record<string, any>;
  }

  export class FaissStore {
    constructor(embeddings: any, options?: FaissStoreOptions);
    
    static fromDocuments(
      docs: Document[], 
      embeddings: any, 
      options?: FaissStoreOptions
    ): Promise<FaissStore>;
    
    static fromTexts(
      texts: string[], 
      metadatas: Record<string, any>[], 
      embeddings: any, 
      options?: FaissStoreOptions
    ): Promise<FaissStore>;
    
    addDocuments(documents: Document[]): Promise<void>;
    
    similaritySearch(
      query: string, 
      k?: number, 
      filter?: Record<string, any>
    ): Promise<Document[]>;
    
    save(directory: string): Promise<void>;
    
    static load(
      directory: string, 
      embeddings: any
    ): Promise<FaissStore>;
  }
}