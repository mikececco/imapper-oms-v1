'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useSupabase } from "./Providers";

// Helper to format address object or string (Copied from ReturnConfirmationModal)
const formatAddress = (address) => {
  if (!address) return 'N/A';
  if (typeof address === 'string') return address;
  
  const namePart = address.name ? (address.company_name ? `${address.name} (${address.company_name})` : address.name) : null;
  const contactPart = [address.email, address.phone].filter(Boolean).join(' | ');
  const addressPart = [
    address.line1,
    address.line2,
    address.house_number,
    address.city,
    address.postal_code,
    address.country
  ].filter(Boolean).join(', ');

  return [namePart, addressPart, contactPart].filter(Boolean).join(' - ');
};

// Single fixed warehouse address (Copied from ReturnConfirmationModal)
const fixedWarehouseAddress = {
  id: 'wh_imapper',
  name: "Lechapelain",
  company_name: "iMapper AMAMI",
  line1: "Rue Ella Maillart",
  line2: '',
  house_number: "7",
  city: "Vannes",
  postal_code: "56000",
  country: "FR",
  phone: "+33679044283",
  email: "shipment@imapper.tech"
};

export default function UpgradeOrderModal({
  isOpen,
  onClose,
  order,
  onCreateReturnLabel,
  onCreateNewLabel,
}) {
  const supabase = useSupabase();
  const [orderPacks, setOrderPacks] = useState([]);
  const [loadingOrderPacks, setLoadingOrderPacks] = useState(false);
  const [selectedOrderPackId, setSelectedOrderPackId] = useState('');
  const [weight, setWeight] = useState('1.000');
  const [quantity, setQuantity] = useState(1);
  
  // Separate Loading States
  const [isCreatingReturnLabel, setIsCreatingReturnLabel] = useState(false);
  const [isCreatingNewLabel, setIsCreatingNewLabel] = useState(false);

  // Address State 
  const [customerAddress, setCustomerAddress] = useState({ name: '', company_name: '', email: '', phone: '', line1: '', line2: '', house_number: '', city: '', postal_code: '', country: '' });
  const [isEditingCustomerAddress, setIsEditingCustomerAddress] = useState(false);
  const [returnToAddressState, setReturnToAddressState] = useState({...fixedWarehouseAddress});
  const [isEditingWarehouseAddress, setIsEditingWarehouseAddress] = useState(false);

  // *** Add State for Return Weight ***
  const [returnWeight, setReturnWeight] = useState('1.000');

  // --- Effects ---

  // Effect to fetch order packs (remains the same)
  useEffect(() => {
    const fetchOrderPacks = async () => {
      if (!supabase || !isOpen) return;
      try {
        setLoadingOrderPacks(true);
        const { data, error } = await supabase
          .from('order_pack_lists')
          .select('id, value, label, weight')
          .order('label');

        if (error) throw error;
        setOrderPacks(data || []);
      } catch (error) {
        console.error('Error fetching order packs:', error);
        toast.error('Failed to load order packs.');
      } finally {
        setLoadingOrderPacks(false);
      }
    };

    if (isOpen) {
      fetchOrderPacks();
    }
  }, [isOpen, supabase]);

  // Effect to initialize form state (including addresses)
  useEffect(() => {
    if (order) {
      // Initialize Pack, Weight, Quantity
      setSelectedOrderPackId(order.order_pack_list_id || '');
      setWeight(order.weight || '1.000');
      setQuantity(order.order_pack_quantity || 1);

      // Initialize customer address (Return From)
      let initialAddress = {
          name: order.name || '',
          company_name: order.company_name || order.name || '',
          email: order.email || '',
          phone: order.phone || '',
          line1: '', line2: '', house_number: '', city: '', postal_code: '', country: ''
      };
      // ... (logic to parse address from order.shipping_address or individual fields)
      if (order.shipping_address && typeof order.shipping_address === 'object') {
        initialAddress = {
          ...initialAddress,
          line1: order.shipping_address.line1 || '',
          line2: order.shipping_address.line2 || '',
          house_number: order.shipping_address.house_number || '',
          city: order.shipping_address.city || '',
          postal_code: order.shipping_address.postal_code || '',
          country: order.shipping_address.country || ''
        };
      } else if (typeof order.shipping_address === 'string') {
        const parts = order.shipping_address.split(',').map(p => p.trim());
         initialAddress = {
          ...initialAddress,
          line1: parts[0] || '',
          line2: '', 
          house_number: '', 
          city: parts[1] || '',
          postal_code: parts[2] || '',
          country: parts[3] || ''
        };
      } else {
         initialAddress = {
          ...initialAddress,
          line1: order.shipping_address_line1 || '',
          line2: order.shipping_address_line2 || '',
          house_number: order.shipping_address_house_number || '',
          city: order.shipping_address_city || '',
          postal_code: order.shipping_address_postal_code || '',
          country: order.shipping_address_country || ''
        };
      }
      setCustomerAddress(initialAddress);

      // Reset warehouse address and editing states
      setReturnToAddressState({...fixedWarehouseAddress});
      setIsEditingCustomerAddress(false);
      setIsEditingWarehouseAddress(false);

    } else {
      // Reset all state if no order
      setSelectedOrderPackId('');
      setWeight('1.000');
      setQuantity(1);
      setCustomerAddress({ name: '', company_name: '', email: '', phone: '', line1: '', line2: '', house_number: '', city: '', postal_code: '', country: '' });
      setReturnToAddressState({...fixedWarehouseAddress});
      setIsEditingCustomerAddress(false);
      setIsEditingWarehouseAddress(false);
    }
  }, [order, isOpen]);

  // --- Handlers ---

  // handleWeightChange, handleQuantityChange remain the same
   const handleWeightChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d{0,3}$/.test(value)) {
      setWeight(value);
    }
  };

  const handleQuantityChange = (e) => {
    const value = e.target.value;
    if (/^\d*$/.test(value)) {
      const newQuantity = parseInt(value) || 1;
      setQuantity(newQuantity);
      const selectedPack = orderPacks.find(p => p.id === selectedOrderPackId);
      if (selectedPack) {
        const newWeight = (parseFloat(selectedPack.weight) * newQuantity).toFixed(3);
        setWeight(newWeight);
      }
    }
  };

  // handleOrderPackSelectChange remains the same
  const handleOrderPackSelectChange = (e) => {
    const value = e.target.value;
    setSelectedOrderPackId(value);
    const selectedPack = orderPacks.find(p => p.id === value);
    if (selectedPack) {
      const currentQuantity = parseInt(quantity) || 1;
      const newWeight = (parseFloat(selectedPack.weight) * currentQuantity).toFixed(3);
      setWeight(newWeight);
    }
  };

  // Add Address Handlers
  const handleCustomerAddressChange = (e) => {
    const { name, value } = e.target;
    setCustomerAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleReturnToAddressChange = (e) => {
    const { name, value } = e.target;
    setReturnToAddressState(prev => ({ ...prev, [name]: value }));
  };

  // *** Add Handler for Return Weight Input ***
  const handleReturnWeightChange = (e) => {
    const value = e.target.value;
    // Allow up to 3 decimal places for weight
    if (/^\d*\.?\d{0,3}$/.test(value)) {
      setReturnWeight(value);
    }
  };

  // --- Specific Action Handlers ---

  // Handler for the "Create Return Label" button
  const handleCreateReturnLabelClick = async () => {
    // Validate only Address fields
    let missingFields = [];
    const requiredCustomerFields = ['name', 'email', 'phone', 'line1', 'house_number', 'city', 'postal_code', 'country'];
    const requiredWarehouseFields = ['name', 'email', 'phone', 'line1', 'house_number', 'city', 'postal_code', 'country'];
    requiredCustomerFields.forEach(field => { if (!customerAddress[field] || String(customerAddress[field]).trim() === '') missingFields.push(`Customer Address: ${field.replace('_', ' ')}`); });
    requiredWarehouseFields.forEach(field => { if (!returnToAddressState[field] || String(returnToAddressState[field]).trim() === '') missingFields.push(`Return To Address: ${field.replace('_', ' ')}`); });

    if (missingFields.length > 0) {
      toast.error(`Please fill in address fields: ${missingFields.join(', ')}`, { duration: 5000 });
      return;
    }

    setIsCreatingReturnLabel(true);
    try {
      // Call the specific prop handler passed from the parent
      await onCreateReturnLabel(order.id, customerAddress, returnToAddressState);
      // Success feedback might be handled in the parent or here
      // toast.success("Return label request sent.");
    } catch (error) {
      console.error("Error creating return label:", error);
      // Error feedback might be handled in the parent or here
      // toast.error(`Failed to create return label: ${error.message}`);
    } finally {
      setIsCreatingReturnLabel(false);
    }
  };

  // Handler for the "Create New Label" button
  const handleCreateNewLabelClick = async () => {
    // Validate only Upgrade Details fields
     let missingFields = [];
     if (!selectedOrderPackId) missingFields.push('New Order Pack');
     const weightValue = parseFloat(weight);
     if (isNaN(weightValue) || weightValue <= 0) missingFields.push('Total Weight (must be > 0)');
     const quantityValue = parseInt(quantity);
     if (isNaN(quantityValue) || quantityValue < 1) missingFields.push('Quantity (must be >= 1)');

    if (missingFields.length > 0) {
      toast.error(`Please fill in new order details: ${missingFields.join(', ')}`, { duration: 5000 });
      return;
    }

    setIsCreatingNewLabel(true);
    const selectedPack = orderPacks.find(p => p.id === selectedOrderPackId);
    const newLabelDetails = {
        order_pack_list_id: selectedOrderPackId,
        order_pack: selectedPack?.value,
        order_pack_label: selectedPack?.label,
        weight: weight,
        quantity: quantityValue,
    };

    try {
        // Call the specific prop handler passed from the parent
        await onCreateNewLabel(order.id, newLabelDetails);
        // toast.success("New label request sent.");
    } catch (error) {
        console.error("Error creating new label:", error);
        // toast.error(`Failed to create new label: ${error.message}`);
    } finally {
        setIsCreatingNewLabel(false);
    }
  };

  // --- Render Logic ---

  if (!order) return null;

  // Add renderAddressFields helper function
  const renderAddressFields = (addressState, setAddressState, handleAddressChange, isEditing, setIsEditing, title) => {
    // Define required fields for display purposes (matching validation)
    const requiredFields = new Set(['name', 'email', 'phone', 'line1', 'house_number', 'city', 'postal_code', 'country']);
    // Define the order and labels for display
    const displayFields = [
      { key: 'name', label: 'Name' },
      { key: 'company_name', label: 'Company' },
      { key: 'email', label: 'Email' },
      { key: 'phone', label: 'Phone' },
      { key: 'line1', label: 'Address 1' },
      { key: 'line2', label: 'Address 2' },
      { key: 'house_number', label: 'House No.' },
      { key: 'city', label: 'City' },
      { key: 'postal_code', label: 'Postal Code' },
      { key: 'country', label: 'Country' },
    ];

    return (
      <div className="mb-4 p-4 border rounded-md flex flex-col h-full"> {/* Ensure full height for flex */} 
        <div className="flex justify-between items-center mb-4"> {/* Increased margin */}
          <h4 className="font-medium text-gray-800 text-lg">{title}</h4> {/* Slightly larger title */} 
          {/* Edit button is now conditionally rendered at the bottom */} 
        </div>
        
        <div className="flex-grow space-y-1 text-sm mb-4"> {/* Main content area */}
          {!isEditing ? (
            // Display mode: Label and Value per line
            displayFields.map(field => (
              // Render row only if value exists
              addressState[field.key] && (
                <div key={field.key} className="flex justify-between">
                  <span className="text-gray-600 font-medium">
                    {field.label}:
                    {requiredFields.has(field.key) && <span className="text-red-500 ml-1">*</span>}
                  </span>
                  <span className="text-gray-800 text-right pl-2">{addressState[field.key] || 'N/A'}</span>
                </div>
              )
            ))
          ) : (
            // Edit mode: Input fields (as previously modified)
            <div className="space-y-3">
              <div><Input placeholder="Name *" name="name" value={addressState.name} onChange={handleAddressChange} required/></div>
              <div><Input placeholder="Company Name" name="company_name" value={addressState.company_name} onChange={handleAddressChange} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"> 
                <div><Input placeholder="Email *" name="email" value={addressState.email} onChange={handleAddressChange} type="email" required/></div>
                <div><Input placeholder="Phone *" name="phone" value={addressState.phone} onChange={handleAddressChange} type="tel" required/></div>
              </div>
              <div><Input placeholder="Address Line 1 *" name="line1" value={addressState.line1} onChange={handleAddressChange} required/></div>
              <div><Input placeholder="House Number *" name="house_number" value={addressState.house_number} onChange={handleAddressChange} required/></div>
              <div><Input placeholder="Address Line 2" name="line2" value={addressState.line2} onChange={handleAddressChange} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3"> 
                <div><Input placeholder="City *" name="city" value={addressState.city} onChange={handleAddressChange} required/></div>
                <div><Input placeholder="Postal Code *" name="postal_code" value={addressState.postal_code} onChange={handleAddressChange} required/></div>
                <div><Input placeholder="Country Code (e.g., FR) *" name="country" value={addressState.country} onChange={handleAddressChange} maxLength={2} required/></div>
              </div>
            </div>
          )}
        </div>
        
        {/* Edit/Cancel Button at the bottom */} 
        <div className="mt-auto pt-4 border-t"> {/* Pushes button to bottom */}
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(!isEditing)} 
                className="w-full" // Make button full width
            >
              {isEditing ? 'Cancel Edit' : 'Edit Address'}
            </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Upgrade Order: {order.id}</DialogTitle>
          <DialogDescription>
            Confirm addresses for return label and new details for the upgraded order.
            Current Pack: <span className="font-medium">{order.order_pack_label || order.order_pack || 'N/A'}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 max-h-[75vh] overflow-y-auto pr-2">
           {/* --- Address Section --- */} 
           <h3 className="text-lg font-semibold border-b pb-2 mb-3">Step 1: Confirm Return Addresses</h3>
           {/* Grid container for side-by-side addresses */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {/* Return From */} 
               {renderAddressFields(
                  customerAddress,
                  setCustomerAddress,
                  handleCustomerAddressChange,
                  isEditingCustomerAddress,
                  setIsEditingCustomerAddress,
                  'Return From (Customer Address)'
                )}
    
               {/* Return To */} 
                {renderAddressFields(
                  returnToAddressState,
                  setReturnToAddressState,
                  handleReturnToAddressChange,
                  isEditingWarehouseAddress,
                  setIsEditingWarehouseAddress,
                  'Return To (Warehouse Address)'
                )}
           </div>
           
           {/* *** Make Original Weight Editable *** */}
           <div className="mb-4 space-y-1">
               <label htmlFor="return-weight" className="block text-sm font-medium text-gray-700">
                   Original Package Weight (for Return) *
               </label>
               {/* Replace static display with Input */}
               <Input
                    id="return-weight"
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={returnWeight} // Bind to returnWeight state
                    onChange={handleReturnWeightChange} // Use specific handler
                    placeholder="Weight (kg)"
                    className="w-full" // Ensure it takes available width
                    required
               />
               <p className="text-xs text-gray-500">Enter the weight to be used for the return label.</p>
           </div>
           
           {/* Button for Address Confirmation / Return Label */} 
           <div className="flex justify-end pt-2">
               <Button 
                 onClick={handleCreateReturnLabelClick} 
                 disabled={isCreatingReturnLabel || isCreatingNewLabel} 
                 className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                 {isCreatingReturnLabel ? (
                    <>{/* spinner */}<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div> Processing...</>
                 ) : (
                    'Create Return Label'
                 )}
               </Button>
           </div>

            <hr className="my-6"/>

           {/* --- Upgrade Details Section --- */} 
           <h3 className="text-lg font-semibold border-b pb-2 mb-3">Step 2: Confirm New Order Details</h3>
           {/* This section remains single column below the addresses */}
           <div className="mb-4 p-4 border rounded-md space-y-3">
              {/* ... New Order Details fields ... */}
               <div>
                <label htmlFor="order-pack-select" className="block text-sm font-medium text-gray-700 mb-1">New Order Pack *</label>
                <select id="order-pack-select" value={selectedOrderPackId} onChange={handleOrderPackSelectChange} disabled={loadingOrderPacks} required className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
                  <option value="" disabled> {loadingOrderPacks ? "Loading packs..." : "-- Select an order pack --"} </option>
                  {orderPacks.map((pack) => ( <option key={pack.id} value={pack.id}> {pack.label} ({pack.weight} kg) </option> ))}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <Input id="quantity" type="number" min="1" step="1" value={quantity} onChange={handleQuantityChange} placeholder="Qty" className="w-full" required />
              </div>
               <div>
                   <label htmlFor="parcel-weight" className="block text-sm font-medium text-gray-700 mb-1">Total Weight (kg) *</label>
                   <Input id="parcel-weight" type="number" step="0.001" min="0.001" value={weight} onChange={handleWeightChange} placeholder="Weight" className="w-full" required />
                </div>
            </div>
             {/* Button for New Label Confirmation */} 
             <div className="flex justify-end pt-4"> 
                 <Button 
                    onClick={handleCreateNewLabelClick} 
                    disabled={isCreatingReturnLabel || isCreatingNewLabel || loadingOrderPacks} 
                    className="bg-green-600 hover:bg-green-700 text-white"
                 >
                    {isCreatingNewLabel ? (
                        <>{/* spinner */}<div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div> Processing...</>
                    ) : (
                        'Create New Label'
                    )}
                 </Button>
             </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isCreatingReturnLabel || isCreatingNewLabel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 