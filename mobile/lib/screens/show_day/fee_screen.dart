import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../components/components.dart';
import '../../theme/app_theme.dart';
import '../../models/show.dart';

/// Screen for editing show fee details
class FeeScreen extends StatefulWidget {
  final Show show;
  final String showId;
  final String orgId;
  final VoidCallback? onFeeChanged;

  const FeeScreen({
    super.key,
    required this.show,
    required this.showId,
    required this.orgId,
    this.onFeeChanged,
  });

  @override
  State<FeeScreen> createState() => _FeeScreenState();
}

class _FeeScreenState extends State<FeeScreen> {
  late TextEditingController _feeController;
  late TextEditingController _paidPercentController;
  String _selectedCurrency = 'USD';
  bool _isLoading = false;
  bool _hasChanges = false;

  final List<String> _currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'CHF', 'JPY'];

  @override
  void initState() {
    super.initState();
    _feeController = TextEditingController(
      text: widget.show.fee?.toStringAsFixed(2) ?? '',
    );
    _paidPercentController = TextEditingController(
      text: widget.show.feePaidPercent?.toString() ?? '0',
    );
    _selectedCurrency = widget.show.feeCurrency ?? 'USD';
    
    _feeController.addListener(_onFieldChanged);
    _paidPercentController.addListener(_onFieldChanged);
  }

  void _onFieldChanged() {
    if (!_hasChanges) {
      setState(() => _hasChanges = true);
    }
  }

  @override
  void dispose() {
    _feeController.dispose();
    _paidPercentController.dispose();
    super.dispose();
  }

  Future<void> _saveFee() async {
    final feeStr = _feeController.text.trim();
    final paidPercentStr = _paidPercentController.text.trim();
    
    if (feeStr.isEmpty) {
      _showError('Please enter a fee amount');
      return;
    }

    final fee = double.tryParse(feeStr);
    if (fee == null) {
      _showError('Invalid fee amount');
      return;
    }

    final paidPercent = int.tryParse(paidPercentStr) ?? 0;
    if (paidPercent < 0 || paidPercent > 100) {
      _showError('Paid percentage must be between 0 and 100');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final supabase = Supabase.instance.client;
      await supabase.rpc('update_show_fee', params: {
        'p_show_id': widget.showId,
        'p_fee': fee,
        'p_fee_currency': _selectedCurrency,
        'p_fee_paid_percent': paidPercent,
      });

      widget.onFeeChanged?.call();
      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      print('Error saving fee: $e');
      if (mounted) {
        _showError('Failed to save fee');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showError(String message) {
    showCupertinoDialog(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('Error'),
        content: Text(message),
        actions: [
          CupertinoDialogAction(
            child: const Text('OK'),
            onPressed: () => Navigator.of(context).pop(),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;

    return CupertinoPageScaffold(
      backgroundColor: AppTheme.getBackgroundColor(brightness),
      navigationBar: CupertinoNavigationBar(
        backgroundColor: AppTheme.getBackgroundColor(brightness),
        border: null,
        middle: Text(
          'Fee',
          style: TextStyle(color: AppTheme.getForegroundColor(brightness)),
        ),
        leading: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: () => Navigator.of(context).pop(),
          child: Icon(
            CupertinoIcons.back,
            color: AppTheme.getForegroundColor(brightness),
          ),
        ),
        trailing: _hasChanges
            ? CupertinoButton(
                padding: EdgeInsets.zero,
                onPressed: _isLoading ? null : _saveFee,
                child: _isLoading
                    ? CupertinoActivityIndicator(
                        color: AppTheme.getForegroundColor(brightness),
                      )
                    : Text(
                        'Save',
                        style: TextStyle(
                          color: AppTheme.getPrimaryColor(brightness),
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              )
            : null,
      ),
      child: SafeArea(
        child: Column(
          children: [
            const SizedBox(height: 24),
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: AppTheme.getCardColor(brightness),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                children: [
                  // Fee Amount Row
                  _buildRow(
                    context,
                    label: 'Fee',
                    child: CupertinoTextField(
                      controller: _feeController,
                      placeholder: '0.00',
                      placeholderStyle: TextStyle(
                        color: AppTheme.getMutedForegroundColor(brightness),
                      ),
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 17,
                      ),
                      decoration: null,
                      textAlign: TextAlign.end,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      inputFormatters: [
                        FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
                      ],
                    ),
                  ),
                  _buildDivider(brightness),
                  // Currency Row
                  GestureDetector(
                    onTap: () => _showCurrencyPicker(context, brightness),
                    child: _buildRow(
                      context,
                      label: 'Currency',
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          Text(
                            _selectedCurrency,
                            style: TextStyle(
                              color: AppTheme.getForegroundColor(brightness),
                              fontSize: 17,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Icon(
                            CupertinoIcons.chevron_right,
                            color: AppTheme.getMutedForegroundColor(brightness),
                            size: 16,
                          ),
                        ],
                      ),
                    ),
                  ),
                  _buildDivider(brightness),
                  // Paid Percentage Row
                  _buildRow(
                    context,
                    label: '% Paid',
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        Expanded(
                          child: CupertinoTextField(
                            controller: _paidPercentController,
                            placeholder: '0',
                            placeholderStyle: TextStyle(
                              color: AppTheme.getMutedForegroundColor(brightness),
                            ),
                            style: TextStyle(
                              color: AppTheme.getForegroundColor(brightness),
                              fontSize: 17,
                            ),
                            decoration: null,
                            textAlign: TextAlign.end,
                            keyboardType: TextInputType.number,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                              LengthLimitingTextInputFormatter(3),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRow(BuildContext context, {required String label, required Widget child}) {
    final brightness = CupertinoTheme.of(context).brightness ?? Brightness.light;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      child: Row(
        children: [
          Text(
            label,
            style: TextStyle(
              color: AppTheme.getForegroundColor(brightness),
              fontSize: 17,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(child: child),
        ],
      ),
    );
  }

  Widget _buildDivider(Brightness brightness) {
    return Container(
      margin: const EdgeInsets.only(left: 16),
      height: 0.5,
      color: AppTheme.getCardBorderColor(brightness),
    );
  }

  void _showCurrencyPicker(BuildContext context, Brightness brightness) {
    showCupertinoModalPopup(
      context: context,
      builder: (context) => Container(
        height: 300,
        color: AppTheme.getBackgroundColor(brightness),
        child: Column(
          children: [
            Container(
              height: 44,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text(
                      'Cancel',
                      style: TextStyle(color: AppTheme.getMutedForegroundColor(brightness)),
                    ),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => Navigator.of(context).pop(),
                    child: Text(
                      'Done',
                      style: TextStyle(
                        color: AppTheme.getPrimaryColor(brightness),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            Expanded(
              child: CupertinoPicker(
                backgroundColor: AppTheme.getBackgroundColor(brightness),
                itemExtent: 40,
                scrollController: FixedExtentScrollController(
                  initialItem: _currencies.indexOf(_selectedCurrency),
                ),
                onSelectedItemChanged: (index) {
                  setState(() {
                    _selectedCurrency = _currencies[index];
                    _hasChanges = true;
                  });
                },
                children: _currencies.map((currency) {
                  return Center(
                    child: Text(
                      currency,
                      style: TextStyle(
                        color: AppTheme.getForegroundColor(brightness),
                        fontSize: 18,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
