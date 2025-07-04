import { Platform, StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingBottom: 40
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#fee',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#d63384',
    flex: 1,
    flexWrap: 'wrap', // Added to prevent text overflow
  },
  retryBtn: {
    backgroundColor: '#d63384',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  loginBtn: {
    backgroundColor: '#007bff',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  loginBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 20,
    borderRadius: 10,
    elevation: 1,
  },
  summarySection: {
    backgroundColor: '#231f20',
    margin: 10,
    padding: 20,
    borderRadius: 10,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#fff',
  },
  loader: {
    padding: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    padding: 20,
  },
  cylinderCard: {
    flexDirection: 'row',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  cylinderImageContainer: {
    marginRight: 12,
  },
  cylinderImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  cylinderInfo: {
    flex: 1,
    marginRight: 15,
  },
  cylinderName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    color: '#333',
    flexWrap: 'wrap', // Added to handle long text
  },
  cylinderDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
    flexWrap: 'wrap', // Added to handle long text
  },
  cylinderPrice: {
    fontSize: 15,
    fontWeight: '500',
    color: '#F50101',
    marginBottom: 4,
  },
  cylinderDesc: {
    fontSize: 12,
    color: '#777',
    fontStyle: 'italic',
    flexWrap: 'wrap', // Added to handle long text
  },
  addBtn: {
    backgroundColor: '#F50101',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    justifyContent: 'center',
  },
  addBtnText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cartImageContainer: {
    marginRight: 10,
  },
  cartImage: {
    width: 45,
    height: 45,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  cartInfo: {
    flex: 1,
  },
  cartName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
    flexWrap: 'wrap', // Added to handle long text
  },
  cartPrice: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  quantityControlsContainer: {
    width: '100%',
    alignItems: 'flex-start',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  qtyBtn: {
    backgroundColor: '#F50101',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  quantity: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 15,
    minWidth: 25,
    textAlign: 'center',
    color: '#333',
  },
  itemTotalNew: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'left',
    marginTop: 5,
    color: '#333',
  },
  // Map Picker Button
  mapPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  mapPickerText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
    flexWrap: 'wrap', // Added to handle long text
  },
  // Map Modal Styles
  mapContainer: {
    flex: 1,
    backgroundColor: '#fff',
    paddingBottom: 40,
  },
  mapHeader: {
    backgroundColor: '#F50101',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 15,
    paddingTop: 50,
  },
  mapCloseBtn: {
    padding: 5,
  },
  mapTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  mapLocationBtn: {
    padding: 5,
  },
  map: {
    flex: 1,
  },
  mapFooter: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  coordinatesText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 15,
  },
  confirmLocationBtn: {
    backgroundColor: '#F50101',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmLocationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Form Styles
  inputGroup: {
    marginBottom: 20,
  },
  halfInputGroup: {
    width: '47%',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  required: {
    color: '#d63384',
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
    minHeight: 45,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    // Platform-specific textAlignVertical
    ...(Platform.OS === 'android' && {
      textAlignVertical: 'top',
    }),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#fff', // Fixed: was '#ffff'
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff', // Fixed: was '#ffff'
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#2196f3',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F50101',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#F50101',
  },
  orderBtn: {
    backgroundColor: '#F50101',
    margin: 15,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  orderBtnText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  bottomSpace: {
    height: 30, // To give some space at the bottom of the scroll view
  },
});