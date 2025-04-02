'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '../components/Providers'; // Assuming you have this provider
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'react-hot-toast';

// Helper to format date
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return 'Invalid date';
  }
};

export default function FeatureRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('Requested'); // State for active tab
  const [updatingRequestId, setUpdatingRequestId] = useState(null); // Track which request is being updated
  const supabase = useSupabase(); // Get Supabase client from context if available

  // Fetch requests on component mount
  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/feature-requests');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch requests' }));
        throw new Error(errorData.error);
      }
      const data = await response.json();
      setRequests(data);
    } catch (error) {
      console.error('Error fetching feature requests:', error);
      toast.error(`Error fetching requests: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // Optionally set author from logged-in user if using Supabase auth
    // const checkUser = async () => {
    //   if (supabase) {
    //     const { data: { user } } = await supabase.auth.getUser();
    //     if (user) {
    //       setAuthor(user.email || 'Unknown User'); // Or user.user_metadata.full_name etc.
    //     }
    //   }
    // };
    // checkUser();
  }, [supabase]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || !author.trim()) {
      toast.error('Please fill in both description and author.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/feature-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, author }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to submit request' }));
        throw new Error(errorData.error);
      }

      const { request: newRequest } = await response.json();
      toast.success('Feature request submitted!');
      setRequests([newRequest, ...requests]); // Add new request to the top
      setDescription(''); // Clear form
      // Keep author field populated if desired

    } catch (error) {
      console.error('Error submitting feature request:', error);
      toast.error(`Submission failed: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle marking a request as Done
  const handleMarkAsDone = async (requestId) => {
    setUpdatingRequestId(requestId);
    try {
      const response = await fetch(`/api/feature-requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Done' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update status' }));
        throw new Error(errorData.error || 'Failed to update status');
      }

      // Don't expect the updated request object back from the API anymore
      // const { request: updatedRequest } = await response.json(); 
      
      // Manually update the status in the local state
      setRequests(prevRequests => 
        prevRequests.map(req => 
          req.id === requestId 
            ? { ...req, status: 'Done' } // Update status for the matching request
            : req
        )
      );
      toast.success('Request marked as Done!');

    } catch (error) {
      console.error('Error marking request as done:', error);
      toast.error(`Update failed: ${error.message}`);
    } finally {
      setUpdatingRequestId(null);
    }
  };

  // Filter requests based on active tab
  const filteredRequests = requests.filter(req => req.status === activeTab);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Feature Requests</h1>

      {/* Submission Form */}
      <div className="mb-8 p-6 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Add a New Request</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Request Description
            </label>
            <Textarea
              id="description"
              rows={4}
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the feature or improvement..."
              required
            />
          </div>
          <div>
            <label htmlFor="author" className="block text-sm font-medium text-gray-700 mb-1">
              Author
            </label>
            <Input
              id="author"
              type="text"
              className="w-full border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="Your name or email"
              required
            />
          </div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </Button>
        </form>
      </div>

      {/* Tabs and Request List */}
      <div className="bg-white p-6 rounded-lg shadow">
        {/* Tab Navigation */}
        <div className="mb-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('Requested')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'Requested'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Requested ({requests.filter(r => r.status === 'Requested').length})
            </button>
            <button
              onClick={() => setActiveTab('Done')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'Done'
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Done ({requests.filter(r => r.status === 'Done').length})
            </button>
          </nav>
        </div>

        {/* Request List */}
        {isLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <p className="text-gray-600">No requests in this category.</p>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => (
              <div key={req.id} className="p-4 border border-gray-200 rounded-md bg-gray-50 flex justify-between items-start">
                <div className="flex-1 mr-4">
                  <p className="font-medium text-gray-800 mb-2">{req.description}</p>
                  <div className="flex items-center text-sm text-gray-500 space-x-4">
                    <span>Requested by: <strong>{req.author}</strong></span>
                    <span>{formatDate(req.created_at)}</span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${req.status === 'Done' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                       {req.status}
                    </span>
                  </div>
                </div>
                {/* Show Done button only in 'Requested' tab */}
                {activeTab === 'Requested' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkAsDone(req.id)}
                    disabled={updatingRequestId === req.id}
                    className="flex-shrink-0"
                  >
                    {updatingRequestId === req.id ? 'Marking...' : 'Mark as Done'}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 