'use client';

import { useState } from 'react';
import ImageUploader from '@/components/ImageUploader';
import DocumentList, { DocItem } from '@/components/DocumentList';
import ImageEditor from '@/components/ImageEditor';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import Image from 'next/image';
import { FileText, Download } from 'lucide-react';

import LandingPage from '@/components/LandingPage';

export default function Home() {
  const [documents, setDocuments] = useState<DocItem[]>([]);
  const [editingDoc, setEditingDoc] = useState<DocItem | null>(null);
  const [showLanding, setShowLanding] = useState(true);
  const { processImage } = useImageProcessor();

  const handleUpload = (files: File[]) => {
    const newDocs = files.map(file => {
      const url = URL.createObjectURL(file);
      return {
        id: Math.random().toString(36).substr(2, 9),
        originalUrl: url,
        currentUrl: url,
        isProcessed: false
      };
    });
    setDocuments(prev => [...prev, ...newDocs]);
  };

  const handleRemove = (id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  };

  const handleProcessDocument = async (id: string) => {
    // Set loading state
    setDocuments(prev => prev.map(doc =>
      doc.id === id ? { ...doc, isProcessing: true } : doc
    ));

    try {
      const doc = documents.find(d => d.id === id);
      if (!doc) return;

      const processedUrl = await processImage(doc.originalUrl);

      // Update with result
      setDocuments(prev => prev.map(d =>
        d.id === id ? {
          ...d,
          currentUrl: processedUrl,
          isProcessed: true,
          isProcessing: false
        } : d
      ));
    } catch (error) {
      console.error("Processing failed:", error);
      alert("AI Processing Failed, please retry");
      // Reset loading state
      setDocuments(prev => prev.map(d =>
        d.id === id ? { ...d, isProcessing: false } : d
      ));
    }
  };

  const handleReorder = (newDocs: DocItem[]) => {
    setDocuments(newDocs);
  };

  const handleSaveEdit = (processedUrl: string) => {
    if (editingDoc) {
      setDocuments(prev => prev.map(doc =>
        doc.id === editingDoc.id ? { ...doc, currentUrl: processedUrl, isProcessed: true } : doc
      ));
      setEditingDoc(null);
    }
  };

  const handleExportPdf = async () => {
    if (documents.length === 0) return;

    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();

      for (let i = 0; i < documents.length; i++) {
        const docItem = documents[i];
        if (i > 0) pdf.addPage();

        // Load image
        const img = new window.Image();
        img.src = docItem.currentUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        // Calculate dimensions to fit A4 (210 x 297 mm)
        const pageWidth = 210;
        const pageHeight = 297;
        const imgRatio = img.width / img.height;

        let renderWidth = pageWidth;
        let renderHeight = pageWidth / imgRatio;

        if (renderHeight > pageHeight) {
          renderHeight = pageHeight;
          renderWidth = pageHeight * imgRatio;
        }

        const x = (pageWidth - renderWidth) / 2;
        const y = (pageHeight - renderHeight) / 2;

        pdf.addImage(img, 'JPEG', x, y, renderWidth, renderHeight);
      }

      pdf.save('scanned_documents.pdf');
    } catch (e) {
      console.error("PDF Generation failed:", e);
      alert("PDF Generation Failed");
    }
  };

  if (showLanding) {
    return <LandingPage onStart={() => setShowLanding(false)} />;
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] text-white selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-lg overflow-hidden shadow-lg shadow-blue-500/20 border border-white/10">
              <Image
                src="/logo.png"
                alt="Logo"
                fill
                className="object-cover"
                sizes="40px"
              />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
              DocuScan AI
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Upload Area */}
        <section>
          <ImageUploader onUpload={handleUpload} compact={documents.length > 0} />
        </section>

        {/* Document Grid */}
        {documents.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-gray-400">
                <FileText className="w-4 h-4" />
                <span className="text-sm font-medium uppercase tracking-wider">Documents ({documents.length})</span>
              </div>

              <button
                onClick={handleExportPdf}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium border border-gray-700 hover:border-gray-600"
              >
                <Download className="w-4 h-4" />
                Generate PDF
              </button>
            </div>

            <DocumentList
              documents={documents}
              onRemove={handleRemove}
              onProcess={handleProcessDocument}
              onView={setEditingDoc}
              onReorder={handleReorder}
            />
          </section>
        )}
      </div>

      {/* Full Screen Editor/Viewer */}
      {editingDoc && (
        <div className="fixed inset-0 z-[100] bg-black animate-in fade-in duration-200">
          <ImageEditor
            imageUrl={editingDoc.originalUrl} // Always pass original for re-editing capability
            initialProcessedUrl={editingDoc.isProcessed ? editingDoc.currentUrl : null}
            onSave={handleSaveEdit}
            onCancel={() => setEditingDoc(null)}
          />
        </div>
      )}
    </main>
  );
}
