import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Table, Button, Badge, Tabs, Tab, Form, InputGroup } from 'react-bootstrap';

const OrderTable = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/orders';
      
      if (activeTab === 'this-week') {
        endpoint = '/api/orders/ship-this-week';
      } else if (activeTab === 'after-week') {
        endpoint = '/api/orders/ship-after-week';
      }
      
      const token = localStorage.getItem('token');
      const res = await axios.get(endpoint, {
        headers: {
          'x-auth-token': token
        }
      });
      
      setOrders(res.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenOrder = (id) => {
    // Navigate to order details page
    window.location.href = `/orders/${id}`;
  };

  const handleUpdateShipStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/orders/${id}`, { ok_to_ship: status }, {
        headers: {
          'x-auth-token': token
        }
      });
      
      // Refresh orders
      fetchOrders();
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const filteredOrders = orders.filter(order => 
    order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="order-table-container">
      <h2>GENERAL</h2>
      
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3"
      >
        <Tab eventKey="all" title="ALL ORDERS" />
        <Tab eventKey="this-week" title="TO SHIP THIS WEEK" />
        <Tab eventKey="after-week" title="TO SHIP AFTER THIS WEEK" />
      </Tabs>
      
      <Form className="mb-3">
        <InputGroup>
          <Form.Control
            type="text"
            placeholder="Search by any field"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </InputGroup>
      </Form>
      
      {loading ? (
        <p>Loading orders...</p>
      ) : (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>Actions</th>
              <th>ID</th>
              <th>Copy</th>
              <th>Ship by</th>
              <th>Paid?</th>
              <th>Ok to Ship?</th>
              <th>Name</th>
              <th>Order Pack</th>
              <th>Package Prepared?</th>
              <th>Serial Number</th>
              <th>Instruction</th>
              <th>Package Weight</th>
              <th>Status</th>
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
                    Open Order
                  </Button>
                </td>
                <td>{order.id}</td>
                <td>
                  <Button 
                    variant="light" 
                    size="sm" 
                    onClick={() => navigator.clipboard.writeText(order.id)}
                  >
                    📋
                  </Button>
                </td>
                <td>{order.ship_by ? new Date(order.ship_by).toLocaleDateString() : ''}</td>
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
                <td>{order.name}</td>
                <td>{order.order_pack}</td>
                <td>
                  {order.package_prepared ? (
                    <Badge bg="success">Yes</Badge>
                  ) : (
                    <Badge bg="warning" text="dark">No</Badge>
                  )}
                </td>
                <td>{order.serial_number}</td>
                <td>{order.instruction}</td>
                <td>{order.package_weight || 'UNKNOWN'}</td>
                <td>
                  <Badge bg={
                    order.status === 'delivered' ? 'success' :
                    order.status === 'shipped' ? 'info' :
                    order.status === 'processing' ? 'primary' :
                    order.status === 'cancelled' ? 'danger' : 'secondary'
                  }>
                    {order.status.toUpperCase()}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
};

export default OrderTable; 