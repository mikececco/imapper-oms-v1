import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, Badge, Form, InputGroup } from 'react-bootstrap';
import { supabase } from '../utils/supabaseClient';

const OrderTable = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      // Fetch orders directly from Supabase instead of through the API
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      console.log('Orders fetched from Supabase:', data);
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOrder = (id) => {
    // For now, just log the order ID
    console.log('Opening order:', id);
    alert(`Opening order: ${id}`);
  };

  const handleUpdateShipStatus = async (id, status) => {
    try {
      // Update order directly in Supabase
      const { error } = await supabase
        .from('orders')
        .update({ ok_to_ship: status, updated_at: new Date() })
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Refresh orders
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const filteredOrders = orders.filter(order => 
    (order.id && order.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (order.name && order.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="order-table-container">
      <h2>ALL ORDERS</h2>
      
      <Form className="mb-3">
        <InputGroup>
          <Form.Control
            type="text"
            placeholder="Search by ID or name"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </Form>
      
      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <div className="alert alert-info">
          No orders found. If you've added orders to Supabase, check the console for any errors.
        </div>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Actions</th>
              <th>ID</th>
              <th>Name</th>
              <th>Order Pack</th>
              <th>Paid?</th>
              <th>Ok to Ship?</th>
              <th>Status</th>
              <th>Created At</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td>
                  <Button 
                    variant="primary" 
                    size="sm" 
                    onClick={() => handleOpenOrder(order.id)}
                  >
                    Open
                  </Button>
                </td>
                <td>{order.id}</td>
                <td>{order.name}</td>
                <td>{order.order_pack}</td>
                <td>
                  {order.paid ? (
                    <Badge bg="success">Yes</Badge>
                  ) : (
                    <Badge bg="danger">No</Badge>
                  )}
                </td>
                <td>
                  <Form.Check
                    type="switch"
                    checked={order.ok_to_ship}
                    onChange={() => handleUpdateShipStatus(order.id, !order.ok_to_ship)}
                  />
                </td>
                <td>
                  <Badge bg={
                    order.status === 'delivered' ? 'success' :
                    order.status === 'shipped' ? 'info' :
                    order.status === 'processing' ? 'primary' :
                    order.status === 'cancelled' ? 'danger' : 'secondary'
                  }>
                    {order.status ? order.status.toUpperCase() : 'PENDING'}
                  </Badge>
                </td>
                <td>{order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default OrderTable; 