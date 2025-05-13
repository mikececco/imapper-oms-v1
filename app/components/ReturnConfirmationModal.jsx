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
  'Other'
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
    } else {
      // Reset customer address if order is null
      setReturnFromAddress({ name: '', company_name: '', email: '', phone: '', line1: '', line2: '', house_number: '', city: '', postal_code: '', country: '' });
      setParcelWeight('1.000'); // Reset weight
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

    if (missingFields.length > 0) {
      toast.error(`Please fill in all required fields: ${missingFields.join(', ')}`, { duration: 5000 });
      return; // Stop if validation fails
    }
    // --- End Validation ---

    console.log("Confirming return with weight:", parcelWeight, typeof parcelWeight);
    // Proceed if validation passes
    if (order && order.id) {
      onConfirm(order.id, returnFromAddress, returnToAddressState, parcelWeight, returnReason);
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
        <div className="flex-grow overflow-y-auto pr-6 py-4">
          <div className="grid grid-cols-[120px_1fr] items-center gap-4 mb-4">
            <span className="text-right font-medium">Order ID:</span>
            <span>{order.id}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-4 mb-4">
            <span className="text-right font-medium">Customer:</span>
            <span>{order.name || 'N/A'}</span>
          </div>
          <div className="grid grid-cols-[120px_1fr] items-center gap-4 mb-6">
            <span className="text-right font-medium">Order Pack:</span>
            <span>{
              loadingOrderPacks ? 'Loading...' : 
              orderPackLists.find(pack => pack.id === order.order_pack_list_id)?.label || 'N/A'
            }</span>
          </div>
          <div className="grid grid-cols-2 gap-x-8">
            <div className="border-t pt-4">
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
            <div className="border-t pt-4">
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
          <div className="mt-4 border-t pt-4 grid gap-4 md:grid-cols-2">
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
          <p className="text-sm text-muted-foreground mt-6">
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