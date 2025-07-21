'use client';

import { useState, useEffect, useRef } from 'react';
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
import { useSupabase } from "./Providers"; // Import useSupabase
import { X } from "lucide-react";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "./ui/select";

// Helper to format address object or string
const formatAddress = (address) => {
  if (!address) return 'N/A';
  if (typeof address === 'string') return address;
  
  // Build the display string, including new fields if they exist
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

// Single fixed warehouse address
const fixedWarehouseAddress = {
  id: 'wh_imapper',
  name: "Lechapelain",
  company_name: "iMapper AMAMI",
  line1: "Rue Anita Conti",
  line2: '',
  house_number: "67",
  city: "Vannes",
  postal_code: "56000",
  country: "FR",
  phone: "+33679044283",
  email: "shipment@imapper.tech"
};

// Define return reasons
const RETURN_REASONS = [
  'Return after-sales service',
  'Return upgrade',
  'Return after trial period',
  'Lease termination',
  'Other'
];

// PARCEL_DESCRIPTION_OPTIONS based on OrderDetailForm.jsx
const PARCEL_DESCRIPTION_OPTIONS = [
  'Laser',
  'Lens',
  'Frame',
  'Accessory',
  'Gift',
  'Sample',
  'Other',
  'Custom...' // This entry is important for the custom logic
];

export default function ReturnConfirmationModal({
  isOpen,
  onClose,
  order,
  onConfirm,
  isLoading,
}) {
  const supabase = useSupabase(); // Get Supabase client
  const [orderPackLists, setOrderPackLists] = useState([]);
  const [loadingOrderPacks, setLoadingOrderPacks] = useState(true);
  
  // State for the editable customer return address
  const [returnFromAddress, setReturnFromAddress] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    line1: '',
    line2: '',
    house_number: '',
    city: '',
    postal_code: '',
    country: ''
  });
  // State to track if the customer address is being edited
  const [isEditingCustomerAddress, setIsEditingCustomerAddress] = useState(false);
  // State for the editable warehouse return address
  const [returnToAddressState, setReturnToAddressState] = useState({...fixedWarehouseAddress});
  // State to track if the warehouse address is being edited
  const [isEditingWarehouseAddress, setIsEditingWarehouseAddress] = useState(false);
  // State for parcel weight
  const [parcelWeight, setParcelWeight] = useState('1.000'); // Default weight
  // ADDED: State for return reason
  const [returnReason, setReturnReason] = useState('');

  // ADDED: Refs for Edit buttons
  const editCustomerAddressButtonRef = useRef(null);
  const editWarehouseAddressButtonRef = useRef(null);

  const [editableParcelItems, setEditableParcelItems] = useState([]);

  // Fetch order pack lists when modal is open
  useEffect(() => {
    const fetchOrderPacks = async () => {
      if (!supabase || !isOpen) {
        setLoadingOrderPacks(false);
        return;
      }
      setLoadingOrderPacks(true);
      try {
        const { data, error } = await supabase
          .from('order_pack_lists')
          .select('id, label'); // Select only id and label
        
        if (error) throw error;
        setOrderPackLists(data || []);
      } catch (error) {
        console.error('Error fetching order pack lists:', error);
        // Don't show toast here, as it might be annoying in a modal
      } finally {
        setLoadingOrderPacks(false);
      }
    };

    fetchOrderPacks();
  }, [isOpen, supabase]);

  // Effect to initialize/reset address state when order changes
  useEffect(() => {
    if (order) {
      let initialAddress = {
          name: order.name || '',
          company_name: order.company_name || order.name || '',
          email: order.email || '',
          phone: order.phone || '',
          line1: '', line2: '', house_number: '', city: '', postal_code: '', country: ''
      };
      
      // Try to parse from shipping_address object first
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
        // Basic fallback for legacy string address (less ideal)
        const parts = order.shipping_address.split(',').map(p => p.trim());
         initialAddress = {
          ...initialAddress,
          line1: parts[0] || '',
          line2: '', // Cannot reliably parse line2
          house_number: '', // Cannot reliably parse house_number
          city: parts[1] || '',
          postal_code: parts[2] || '',
          country: parts[3] || ''
        };
      } else {
        // Fallback to individual fields
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
      setReturnFromAddress(initialAddress);
      // Set initial weight from order or default
      setParcelWeight(order.weight || '1.000');

      const initialItems = order.initialParcelItems || [];
      setEditableParcelItems(initialItems.length > 0 ? JSON.parse(JSON.stringify(initialItems)) : []);
    } else {
      // Reset customer address if order is null
      setReturnFromAddress({ name: '', company_name: '', email: '', phone: '', line1: '', line2: '', house_number: '', city: '', postal_code: '', country: '' });
      setParcelWeight('1.000'); // Reset weight
      setEditableParcelItems([]);
    }
    // Reset customer editing state 
    setIsEditingCustomerAddress(false);
    // Reset warehouse editing state
    setIsEditingWarehouseAddress(false);
    // Reset warehouse address state to fixed value on order change
    setReturnToAddressState({...fixedWarehouseAddress});
    // ADDED: Reset return reason
    setReturnReason('');
  }, [order]);

  // Separate effect to handle parcel items based on country changes
  useEffect(() => {
    if (!order) return;
    
    const fromCountry = (order.shipping_address?.country || order.shipping_address_country)?.toUpperCase();
    const effectiveReturnFromCountry = (returnFromAddress.country || fromCountry)?.toUpperCase(); 
    const countriesReqCustoms = ['GB', 'CH', 'US', 'CA', 'AU', 'NO'];
    
    if (countriesReqCustoms.includes(effectiveReturnFromCountry)) {
      // Only initialize if no items exist yet
      if (editableParcelItems.length === 0) {
        const initialItems = order.initialParcelItems || [];
        if (initialItems.length > 0) {
          setEditableParcelItems(JSON.parse(JSON.stringify(initialItems))); // Deep copy
        } else {
          // Start with one blank item if customs are required for the return and no initial items from order
          setEditableParcelItems([{
            description: '',
            quantity: 1,
            weight: '0.100', // Default item weight
            value: '1.00',   // Default item value
            hs_code: '',     // Default HS Code
            origin_country: effectiveReturnFromCountry || '' // Default to return from country
          }]);
        }
      }
    } else {
      // Clear items if not a customs country
      setEditableParcelItems([]);
    }
  }, [returnFromAddress.country, order]);

  const initialParcelItems = order?.initialParcelItems || [];

  // -- DEBUGGING LOG --
  if (isOpen) { // Only log when the modal is intended to be open
    console.log('[ReturnConfirmationModal] Order Prop:', JSON.parse(JSON.stringify(order))); // Deep copy for better inspection
    console.log('[ReturnConfirmationModal] Initial Parcel Items for Display:', initialParcelItems);
  }
  // -- END DEBUGGING LOG --

  const countriesRequiringCustoms = ['GB', 'CH', 'US', 'CA', 'AU', 'NO'];
  const returnFromCountryCode = returnFromAddress.country ? returnFromAddress.country.toUpperCase() : null;
  const displayParcelItemsSection = countriesRequiringCustoms.includes(returnFromCountryCode);

  // --- Item Handlers ---
  const handleItemChange = (index, field, value) => {
    const updatedItems = [...editableParcelItems];
    let processedValue = value;

    if (field === 'quantity') {
      processedValue = parseInt(value, 10) || 1;
      if (processedValue < 1) processedValue = 1;
    }
    if (field === 'value' || field === 'weight') {
      const numValue = parseFloat(value);
      processedValue = isNaN(numValue) ? (field === 'weight' ? '0.000' : '0.00') : numValue.toFixed(field === 'weight' ? 3 : 2);
    }
    if (field === 'origin_country') {
      processedValue = value.toUpperCase();
    }

    updatedItems[index][field] = processedValue;
    setEditableParcelItems(updatedItems);
  };

  const handleDescriptionSelectChange = (index, selectedValue) => {
    const updatedItems = [...editableParcelItems];
    if (selectedValue === 'Custom...') {
      updatedItems[index].description = ''; // Clear description to allow custom input
    } else {
      updatedItems[index].description = selectedValue;
    }
    setEditableParcelItems(updatedItems);
  };

  const handleAddItem = () => {
    setEditableParcelItems([
      ...editableParcelItems,
      {
        description: '',
        quantity: 1,
        weight: '0.100',
        value: '1.00',
        hs_code: '',
        origin_country: returnFromCountryCode || ''
      }
    ]);
  };

  const handleRemoveItem = (index) => {
    const updatedItems = editableParcelItems.filter((_, i) => i !== index);
    setEditableParcelItems(updatedItems);
  };
  // --- End Item Handlers ---

  if (!order) return null;

  const handleConfirm = () => {
    // --- Validation --- 
    const requiredFromFields = ['name', 'email', 'phone', 'line1', 'house_number', 'city', 'postal_code', 'country'];
    const requiredToFields = ['name', 'email', 'phone', 'line1', 'house_number', 'city', 'postal_code', 'country'];
    let missingFields = [];

    // Check From Address
    requiredFromFields.forEach(field => {
      if (!returnFromAddress[field] || (typeof returnFromAddress[field] === 'string' && returnFromAddress[field].trim() === '')) {
        missingFields.push(`Return From: ${field.replace('_', ' ')}`);
      }
    });

    // Check To Address
    requiredToFields.forEach(field => {
      if (!returnToAddressState[field] || (typeof returnToAddressState[field] === 'string' && returnToAddressState[field].trim() === '')) {
        missingFields.push(`Return To: ${field.replace('_', ' ')}`);
      }
    });

    // Check Weight
    const weightValue = parseFloat(parcelWeight);
    if (isNaN(weightValue) || weightValue <= 0) {
        missingFields.push('Parcel Weight (must be > 0)');
    }

    // ADDED: Check Return Reason
    if (!returnReason || returnReason.trim() === '') {
        missingFields.push('Return Reason');
    }

    // VALIDATION FOR PARCEL ITEMS if section is displayed
    if (displayParcelItemsSection) {
      if (editableParcelItems.length === 0) {
        missingFields.push('At least one item in package (for customs)');
      }
      editableParcelItems.forEach((item, index) => {
        if (!item.description?.trim()) missingFields.push(`Item #${index + 1}: Description`);
        if (!(parseInt(item.quantity, 10) > 0)) missingFields.push(`Item #${index + 1}: Quantity`);
        if (!(parseFloat(item.value) >= 0)) missingFields.push(`Item #${index + 1}: Value`); // Allow 0 value
        if (!(parseFloat(item.weight) > 0)) missingFields.push(`Item #${index + 1}: Weight`);
        if (!item.hs_code?.trim()) missingFields.push(`Item #${index + 1}: HS Code`);
        if (!item.origin_country?.trim()) missingFields.push(`Item #${index + 1}: Origin Country`);
      });
    }

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`, { duration: 5000 });
      return;
    }

    console.log("Confirming return with weight:", parcelWeight, typeof parcelWeight);
    // Pass editableParcelItems in onConfirm
    if (order && order.id) {
      onConfirm(order.id, returnFromAddress, returnToAddressState, parcelWeight, returnReason, displayParcelItemsSection ? editableParcelItems : []);
    }
  };

  // Handler for customer address input changes
  const handleCustomerAddressChange = (e) => {
    const { name, value } = e.target;
    setReturnFromAddress(prev => ({ ...prev, [name]: value }));
  };

  // Handler for warehouse address input changes
  const handleReturnToAddressChange = (e) => {
    const { name, value } = e.target;
    setReturnToAddressState(prev => ({ ...prev, [name]: value }));
  };

  // Handler for weight change
  const handleWeightChange = (e) => {
      // Basic validation to allow only numbers and one decimal point
      const value = e.target.value;
      if (/^\d*\.?\d*$/.test(value)) { 
          setParcelWeight(value);
      }
  };

  // ADDED: Handler for standard HTML select change
  const handleStandardSelectChange = (e) => {
    setReturnReason(e.target.value);
  };

  // ADDED: Function to handle confirming customer address edit
  const handleConfirmCustomerAddress = () => {
    setIsEditingCustomerAddress(false);
    // Ensure focus returns to the edit button after state update
    requestAnimationFrame(() => {
      editCustomerAddressButtonRef.current?.focus();
    });
  };

  // ADDED: Function to handle confirming warehouse address edit
  const handleConfirmWarehouseAddress = () => {
    setIsEditingWarehouseAddress(false);
    // Ensure focus returns to the edit button after state update
    requestAnimationFrame(() => {
      editWarehouseAddressButtonRef.current?.focus();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Confirm Return Label Creation</DialogTitle>
          <DialogDescription>
            Please review the details below before creating the return label for Order #{order.id}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-y-auto pr-6 py-4 flex flex-col gap-6">
          <div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4 mb-1">
              <span className="text-right font-medium">Order ID:</span>
              <span>{order.id}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4 mb-1">
              <span className="text-right font-medium">Customer:</span>
              <span>{order.name || 'N/A'}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] items-center gap-4">
              <span className="text-right font-medium">Order Pack:</span>
              <span>{
                loadingOrderPacks ? 'Loading...' : 
                orderPackLists.find(pack => pack.id === order.order_pack_list_id)?.label || 'N/A'
              }</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 border-t pt-6">
            <div className="">
              <label className="font-medium text-md mb-2 block">Return From</label>
              {isEditingCustomerAddress ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="return-name" className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                      <Input 
                        id="return-name"
                        name="name"
                        placeholder="Customer Name"
                        value={returnFromAddress.name}
                        onChange={handleCustomerAddressChange}
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="return-company_name" className="block text-xs font-medium text-gray-700 mb-1">Company (Optional)</label>
                      <Input 
                        id="return-company_name"
                        name="company_name"
                        placeholder="Company Name"
                        value={returnFromAddress.company_name}
                        onChange={handleCustomerAddressChange}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="return-email" className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                      <Input 
                        id="return-email"
                        name="email"
                        type="email"
                        placeholder="Email Address"
                        value={returnFromAddress.email}
                        onChange={handleCustomerAddressChange}
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="return-phone" className="block text-xs font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
                      <Input 
                        id="return-phone"
                        name="phone"
                        type="tel"
                        placeholder="Phone Number"
                        value={returnFromAddress.phone}
                        onChange={handleCustomerAddressChange}
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="return-line1" className="block text-xs font-medium text-gray-700 mb-1">Address Line 1 <span className="text-red-500">*</span></label>
                    <Input 
                      id="return-line1"
                      name="line1"
                      placeholder="Address Line 1"
                      value={returnFromAddress.line1}
                      onChange={handleCustomerAddressChange}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="return-line2" className="block text-xs font-medium text-gray-700 mb-1">Address Line 2 (Optional)</label>
                      <Input 
                        id="return-line2"
                        name="line2"
                        placeholder="Address Line 2"
                        value={returnFromAddress.line2}
                        onChange={handleCustomerAddressChange}
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label htmlFor="return-house_number" className="block text-xs font-medium text-gray-700 mb-1">House Number <span className="text-red-500">*</span></label>
                      <Input 
                        id="return-house_number"
                        name="house_number"
                        placeholder="House Number"
                        value={returnFromAddress.house_number}
                        onChange={handleCustomerAddressChange}
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="return-city" className="block text-xs font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                      <Input 
                        id="return-city"
                        name="city"
                        placeholder="City"
                        value={returnFromAddress.city}
                        onChange={handleCustomerAddressChange}
                        disabled={isLoading}
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="return-postal_code" className="block text-xs font-medium text-gray-700 mb-1">Postal Code <span className="text-red-500">*</span></label>
                      <Input 
                        id="return-postal_code"
                        name="postal_code"
                        placeholder="Postal Code"
                        value={returnFromAddress.postal_code}
                        onChange={handleCustomerAddressChange}
                        disabled={isLoading}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="return-country" className="block text-xs font-medium text-gray-700 mb-1">Country Code <span className="text-red-500">*</span></label>
                    <Input 
                      id="return-country"
                      name="country"
                      placeholder="Country Code (e.g., NL, US)"
                      value={returnFromAddress.country}
                      onChange={handleCustomerAddressChange}
                      disabled={isLoading}
                      required
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleConfirmCustomerAddress}
                    disabled={isLoading}
                    className="mt-2 justify-self-start" 
                  >
                    Confirm Address
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-1 text-sm flex-grow">
                    {/* Always render all fields, show asterisk for required */}
                    <><span className="font-medium text-gray-600 text-right">Name: <span className="text-red-500">*</span></span><span>{returnFromAddress.name}</span></>
                    <><span className="font-medium text-gray-600 text-right">Company:</span><span>{returnFromAddress.company_name}</span></>
                    <><span className="font-medium text-gray-600 text-right">Email: <span className="text-red-500">*</span></span><span>{returnFromAddress.email}</span></>
                    <><span className="font-medium text-gray-600 text-right">Phone: <span className="text-red-500">*</span></span><span>{returnFromAddress.phone}</span></>
                    <><span className="font-medium text-gray-600 text-right">Address 1: <span className="text-red-500">*</span></span><span>{returnFromAddress.line1}</span></>
                    <><span className="font-medium text-gray-600 text-right">Address 2:</span><span>{returnFromAddress.line2}</span></>
                    <><span className="font-medium text-gray-600 text-right">House No.: <span className="text-red-500">*</span></span><span>{returnFromAddress.house_number}</span></>
                    <><span className="font-medium text-gray-600 text-right">City: <span className="text-red-500">*</span></span><span>{returnFromAddress.city}</span></>
                    <><span className="font-medium text-gray-600 text-right">Postal Code: <span className="text-red-500">*</span></span><span>{returnFromAddress.postal_code}</span></>
                    <><span className="font-medium text-gray-600 text-right">Country: <span className="text-red-500">*</span></span><span>{returnFromAddress.country}</span></>
                  </div>
                  <Button 
                    ref={editCustomerAddressButtonRef}
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditingCustomerAddress(true)}
                    disabled={isLoading}
                    className="mt-2 justify-self-start"
                  >
                    Edit Address
                  </Button>
                </div>
              )}
            </div>
            <div className="">
              <label className="font-medium text-md mb-2 block">Return To</label>
              {isEditingWarehouseAddress ? (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="return-to-name" className="block text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                      <Input id="return-to-name" name="name" placeholder="Warehouse Name" value={returnToAddressState.name} onChange={handleReturnToAddressChange} disabled={isLoading} required />
                    </div>
                    <div>
                      <label htmlFor="return-to-company_name" className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                      <Input id="return-to-company_name" name="company_name" placeholder="Company Name" value={returnToAddressState.company_name} onChange={handleReturnToAddressChange} disabled={isLoading} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="return-to-email" className="block text-xs font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                      <Input id="return-to-email" name="email" type="email" placeholder="Email" value={returnToAddressState.email} onChange={handleReturnToAddressChange} disabled={isLoading} required />
                    </div>
                    <div>
                      <label htmlFor="return-to-phone" className="block text-xs font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
                      <Input id="return-to-phone" name="phone" type="tel" placeholder="Phone" value={returnToAddressState.phone} onChange={handleReturnToAddressChange} disabled={isLoading} required />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="return-to-line1" className="block text-xs font-medium text-gray-700 mb-1">Address Line 1 <span className="text-red-500">*</span></label>
                    <Input id="return-to-line1" name="line1" placeholder="Address Line 1" value={returnToAddressState.line1} onChange={handleReturnToAddressChange} disabled={isLoading} required />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="return-to-line2" className="block text-xs font-medium text-gray-700 mb-1">Address Line 2</label>
                      <Input id="return-to-line2" name="line2" placeholder="Address Line 2" value={returnToAddressState.line2} onChange={handleReturnToAddressChange} disabled={isLoading} />
                    </div>
                    <div>
                      <label htmlFor="return-to-house_number" className="block text-xs font-medium text-gray-700 mb-1">House No. <span className="text-red-500">*</span></label>
                      <Input id="return-to-house_number" name="house_number" placeholder="House No." value={returnToAddressState.house_number} onChange={handleReturnToAddressChange} disabled={isLoading} required />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="return-to-city" className="block text-xs font-medium text-gray-700 mb-1">City <span className="text-red-500">*</span></label>
                      <Input id="return-to-city" name="city" placeholder="City" value={returnToAddressState.city} onChange={handleReturnToAddressChange} disabled={isLoading} required />
                    </div>
                    <div>
                      <label htmlFor="return-to-postal_code" className="block text-xs font-medium text-gray-700 mb-1">Postal Code <span className="text-red-500">*</span></label>
                      <Input id="return-to-postal_code" name="postal_code" placeholder="Postal Code" value={returnToAddressState.postal_code} onChange={handleReturnToAddressChange} disabled={isLoading} required />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="return-to-country" className="block text-xs font-medium text-gray-700 mb-1">Country Code <span className="text-red-500">*</span></label>
                    <Input id="return-to-country" name="country" placeholder="Country Code" value={returnToAddressState.country} onChange={handleReturnToAddressChange} disabled={isLoading} required />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleConfirmWarehouseAddress}
                    disabled={isLoading}
                    className="mt-2 justify-self-start" 
                  >
                    Confirm Address
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                   <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-1 text-sm flex-grow">
                      {/* Always render all fields, show asterisk for required */}
                      <><span className="font-medium text-gray-600 text-right">Name: <span className="text-red-500">*</span></span><span>{returnToAddressState.name}</span></>
                      <><span className="font-medium text-gray-600 text-right">Company:</span><span>{returnToAddressState.company_name}</span></>
                      <><span className="font-medium text-gray-600 text-right">Email: <span className="text-red-500">*</span></span><span>{returnToAddressState.email}</span></>
                      <><span className="font-medium text-gray-600 text-right">Phone: <span className="text-red-500">*</span></span><span>{returnToAddressState.phone}</span></>
                      <><span className="font-medium text-gray-600 text-right">Address 1: <span className="text-red-500">*</span></span><span>{returnToAddressState.line1}</span></>
                      <><span className="font-medium text-gray-600 text-right">Address 2:</span><span>{returnToAddressState.line2}</span></>
                      <><span className="font-medium text-gray-600 text-right">House No.: <span className="text-red-500">*</span></span><span>{returnToAddressState.house_number}</span></>
                      <><span className="font-medium text-gray-600 text-right">City: <span className="text-red-500">*</span></span><span>{returnToAddressState.city}</span></>
                      <><span className="font-medium text-gray-600 text-right">Postal Code: <span className="text-red-500">*</span></span><span>{returnToAddressState.postal_code}</span></>
                      <><span className="font-medium text-gray-600 text-right">Country: <span className="text-red-500">*</span></span><span>{returnToAddressState.country}</span></>
                   </div>
                   <Button 
                      ref={editWarehouseAddressButtonRef}
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingWarehouseAddress(true)}
                      disabled={isLoading}
                      className="mt-2 justify-self-start"
                   >
                      Edit Address
                   </Button>
                </div>
              )}
            </div>
          </div>
          <div className="border-t pt-6 grid gap-4 md:grid-cols-2">
             <div> 
                <label htmlFor="parcel-weight" className="block text-sm font-medium text-gray-700 mb-1">Parcel Weight (kg) <span className="text-red-500">*</span></label>
                <Input 
                  id="parcel-weight"
                  name="parcelWeight"
                  type="text" // Use text for more flexible input, validation is manual
                  inputMode="decimal" // Hint for mobile keyboards
                  placeholder="e.g., 1.500"
                  value={parcelWeight}
                  onChange={handleWeightChange}
                  disabled={isLoading}
                  required
                  className="max-w-xs" // Limit width
                />
             </div>
             <div>
                <label htmlFor="return-reason" className="block text-sm font-medium text-gray-700 mb-1">Return Reason <span className="text-red-500">*</span></label>
                <select 
                  id="return-reason"
                  value={returnReason} 
                  onChange={handleStandardSelectChange} // Use new handler
                  disabled={isLoading} 
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" // Basic styling similar to Input/SelectTrigger
                >
                  <option value="" disabled>Select a reason...</option>
                  {RETURN_REASONS.map(reason => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
             </div>
          </div>
          {/* Editable Parcel Items Section - Using HTML Table */}
          {displayParcelItemsSection && (
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-sm">Items in Return Package (for Customs)</h4>
                <Button size="xs" variant="outline" onClick={handleAddItem} disabled={isLoading}>+ Add Item</Button>
              </div>
              {editableParcelItems.length === 0 && (
                 <p className="text-xs text-gray-500 mb-2">At least one item is required for customs for returns from {returnFromCountryCode}.</p>
              )}
              {editableParcelItems.length > 0 && (
                <div className="overflow-x-auto border rounded-md max-h-72"> {/* Added max-h for table scroll */}
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-100 sticky top-0 z-10"> {/* Sticky header */}
                      <tr>
                        <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase whitespace-nowrap">Desc.</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase whitespace-nowrap">Qty</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase whitespace-nowrap">Value (€)</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase whitespace-nowrap">Weight (kg)</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase whitespace-nowrap">HS Code</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase whitespace-nowrap">Origin</th>
                        <th className="px-2 py-2 text-left font-medium text-gray-600 uppercase whitespace-nowrap">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {editableParcelItems.map((item, index) => {
                        const isCustomDescription = !PARCEL_DESCRIPTION_OPTIONS.includes(item.description) || item.description === '';
                        const selectValue = isCustomDescription ? 'Custom...' : item.description;
                        return (
                          <tr key={index}>
                            <td className="px-1 py-1 align-top min-w-[200px]">
                              <select
                                value={selectValue}
                                onChange={e => handleDescriptionSelectChange(index, e.target.value)}
                                className="w-full border-gray-300 rounded p-1 text-xs h-8 mb-1 focus:ring-indigo-500 focus:border-indigo-500"
                                disabled={isLoading}
                              >
                                {PARCEL_DESCRIPTION_OPTIONS.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                              {selectValue === 'Custom...' && (
                                <Input
                                  type="text"
                                  value={item.description} // This will be empty if 'Custom...' was just selected
                                  onChange={e => handleItemChange(index, 'description', e.target.value)}
                                  className="w-full border-gray-300 rounded p-1 text-xs h-8 focus:ring-indigo-500 focus:border-indigo-500"
                                  placeholder="Custom description"
                                  disabled={isLoading}
                                />
                              )}
                            </td>
                            <td className="px-1 py-1 align-top"><Input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} className="w-16 border-gray-300 rounded p-1 text-xs h-8 focus:ring-indigo-500 focus:border-indigo-500" min="1" disabled={isLoading}/></td>
                            <td className="px-1 py-1 align-top"><Input type="text" inputMode="decimal" value={item.value} onChange={(e) => handleItemChange(index, 'value', e.target.value)} className="w-20 border-gray-300 rounded p-1 text-xs h-8 focus:ring-indigo-500 focus:border-indigo-500" placeholder="0.00" disabled={isLoading}/></td>
                            <td className="px-1 py-1 align-top"><Input type="text" inputMode="decimal" value={item.weight} onChange={(e) => handleItemChange(index, 'weight', e.target.value)} className="w-20 border-gray-300 rounded p-1 text-xs h-8 focus:ring-indigo-500 focus:border-indigo-500" placeholder="0.000" disabled={isLoading}/></td>
                            <td className="px-1 py-1 align-top"><Input type="text" value={item.hs_code} onChange={(e) => handleItemChange(index, 'hs_code', e.target.value)} className="w-24 border-gray-300 rounded p-1 text-xs h-8 focus:ring-indigo-500 focus:border-indigo-500" placeholder="HS Code" disabled={isLoading}/></td>
                            <td className="px-1 py-1 align-top"><Input type="text" value={item.origin_country} onChange={(e) => handleItemChange(index, 'origin_country', e.target.value)} className="w-12 border-gray-300 rounded p-1 text-xs h-8 focus:ring-indigo-500 focus:border-indigo-500" placeholder="FR" maxLength="2" disabled={isLoading}/></td>
                            <td className="px-1 py-1 align-top text-center">
                              <Button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                variant="ghost" // More subtle remove button
                                size="iconxs" // Assuming a very small icon-like button size
                                className="text-red-500 hover:text-red-700 h-8 w-8 p-1"
                                title="Remove Item"
                                disabled={isLoading}
                              >
                                <X className="h-3 w-3" /> {/* Using lucide-react X icon */}
                              </Button>
                            </td>
                          </tr>
                        )}
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          <p className="text-sm text-muted-foreground pt-6 border-t">
            This will generate a Sendcloud return label using the addresses and reason above. 
            The label PDF and tracking information will be linked to this order.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                Creating...
              </>
            ) : (
              'Confirm & Create Label'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 