"use client"

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from './ui/dialog';

export default function TestDialog() {
  const [isOpen, setIsOpen] = useState(false);

  const openDialog = () => {
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
  };

  return (
    <div>
      <button 
        onClick={openDialog}
        className="px-4 py-2 bg-black text-white rounded hover:opacity-90"
      >
        Open Test Dialog
      </button>

      <Dialog open={isOpen} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Test Dialog</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>This is a test dialog to verify that the Dialog component works correctly.</p>
          </div>
          <DialogFooter>
            <button 
              onClick={closeDialog}
              className="px-4 py-2 bg-black text-white rounded hover:opacity-90"
            >
              Close
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 