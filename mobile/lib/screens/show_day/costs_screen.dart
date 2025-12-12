import 'package:flutter/cupertino.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../components/components.dart';
import '../../theme/app_theme.dart';
import '../../models/show_day.dart';
import 'widgets/detail_modal.dart';

/// Screen for viewing and managing show costs
class CostsScreen extends StatefulWidget {
  final List<ShowCost> costs;
  final String showId;
  final String orgId;
  final VoidCallback? onCostsChanged;

  const CostsScreen({
    super.key,
    required this.costs,
    required this.showId,
    required this.orgId,
    this.onCostsChanged,
  });

  @override
  State<CostsScreen> createState() => _CostsScreenState();
}

class _CostsScreenState extends State<CostsScreen> {
  late List<ShowCost> _costs;

  @override
  void initState() {
    super.initState();
    _costs = List.from(widget.costs);
  }

  double get _totalCosts {
    return _costs.fold(0.0, (sum, cost) => sum + cost.amount);
  }

  String get _formattedTotal {
    // Use the currency of the first cost, or USD as default
    final currency = _costs.isNotEmpty ? _costs.first.currency : 'USD';
    final symbol = _getCurrencySymbol(currency);
    return '$symbol${_totalCosts.toStringAsFixed(2)}';
  }

  String _getCurrencySymbol(String currency) {
    switch (currency.toUpperCase()) {
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'SEK':
      case 'NOK':
      case 'DKK':
        return 'kr';
      case 'CHF':
        return 'CHF ';
      case 'JPY':
        return '¥';
      case 'USD':
      case 'CAD':
      case 'AUD':
      default:
        return '\$';
    }
  }

  void _openAddCost() async {
    final result = await Navigator.of(context).push<ShowCost>(
      SwipeablePageRoute(
        builder: (context) => AddCostScreen(
          showId: widget.showId,
          orgId: widget.orgId,
        ),
      ),
    );

    if (result != null) {
      setState(() {
        _costs.add(result);
      });
      widget.onCostsChanged?.call();
    }
  }

  void _openEditCost(ShowCost cost) async {
    final updated = await Navigator.of(context).push<ShowCost>(
      SwipeablePageRoute(
        builder: (context) => EditCostScreen(
          cost: cost,
        ),
      ),
    );

    if (updated != null && mounted) {
      setState(() {
        final index = _costs.indexWhere((c) => c.id == updated.id);
        if (index != -1) {
          _costs[index] = updated;
        }
      });
      widget.onCostsChanged?.call();
    }
  }

  void _openCostDetails(ShowCost cost) {
    Navigator.of(context).push(
      SwipeablePageRoute(
        builder: (context) {
          return DetailModal(
            title: cost.name,
            subtitle: cost.formattedAmount,
            content: [
              DetailSplitCard(
                label1: 'Amount',
                value1: cost.formattedAmount,
                label2: 'Currency',
                value2: cost.currency,
              ),
              if (cost.notes != null && cost.notes!.isNotEmpty)
                DetailValueCard(
                  label: 'Notes',
                  value: cost.notes!,
                ),
            ],
            onEdit: () {
              Navigator.of(context).pop();
              _openEditCost(cost);
            },
          );
        },
      ),
    );
  }

  Future<void> _deleteCost(ShowCost cost) async {
    final confirm = await showCupertinoDialog<bool>(
      context: context,
      builder: (context) => CupertinoAlertDialog(
        title: const Text('Delete Cost'),
        content: Text('Are you sure you want to delete "${cost.name}"?'),
        actions: [
          CupertinoDialogAction(
            isDestructiveAction: true,
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Delete'),
          ),
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );

    if (confirm == true) {
      try {
        final supabase = Supabase.instance.client;
        await supabase.rpc('delete_show_cost', params: {
          'p_cost_id': cost.id,
        });

        setState(() {
          _costs.removeWhere((c) => c.id == cost.id);
        });
        widget.onCostsChanged?.call();
      } catch (e) {
        print('Error deleting cost: $e');
        if (mounted) {
          _showError('Failed to delete cost');
        }
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
          'Costs',
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
      ),
      child: SafeArea(
        child: Stack(
          children: [
            Column(
              children: [
                // Total header
                Container(
                  padding: const EdgeInsets.symmetric(vertical: 32),
                  alignment: Alignment.center,
                  child: Column(
                    children: [
                      Text(
                        _formattedTotal,
                        style: TextStyle(
                          color: AppTheme.getForegroundColor(brightness),
                          fontSize: 40,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Total',
                        style: TextStyle(
                          color: AppTheme.getMutedForegroundColor(brightness),
                          fontSize: 16,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ),

                // Cost list
                Expanded(
                  child: _costs.isEmpty
                      ? Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                CupertinoIcons.creditcard,
                                size: 48,
                                color: AppTheme.getMutedForegroundColor(brightness).withValues(alpha: 0.5),
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'No costs added',
                                style: TextStyle(
                                  color: AppTheme.getForegroundColor(brightness),
                                  fontSize: 17,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Tap Add to create a cost',
                                style: TextStyle(
                                  color: AppTheme.getMutedForegroundColor(brightness),
                                  fontSize: 14,
                                ),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(24, 0, 24, 100),
                          itemCount: _costs.length,
                          itemBuilder: (context, index) {
                            final cost = _costs[index];
                            return Dismissible(
                              key: Key(cost.id),
                              direction: DismissDirection.endToStart,
                              background: Container(
                                alignment: Alignment.centerRight,
                                padding: const EdgeInsets.only(right: 20),
                                color: CupertinoColors.destructiveRed,
                                child: const Icon(
                                  CupertinoIcons.trash,
                                  color: CupertinoColors.white,
                                ),
                              ),
                              onDismissed: (_) => _deleteCost(cost),
                              child: GestureDetector(
                                onTap: () => _openCostDetails(cost),
                                child: Container(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  padding: const EdgeInsets.all(16),
                                  decoration: BoxDecoration(
                                    color: AppTheme.getCardColor(brightness),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              cost.name,
                                              style: TextStyle(
                                                color: AppTheme.getForegroundColor(brightness),
                                                fontSize: 16,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                            if (cost.notes != null && cost.notes!.isNotEmpty) ...[
                                              const SizedBox(height: 4),
                                              Text(
                                                cost.notes!,
                                                style: TextStyle(
                                                  color: AppTheme.getMutedForegroundColor(brightness),
                                                  fontSize: 13,
                                                ),
                                                maxLines: 1,
                                                overflow: TextOverflow.ellipsis,
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Text(
                                        cost.formattedAmount,
                                        style: TextStyle(
                                          color: AppTheme.getForegroundColor(brightness),
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      GestureDetector(
                                        onTap: () => _openEditCost(cost),
                                        child: Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: AppTheme.getBackgroundColor(brightness),
                                            shape: BoxShape.circle,
                                            border: Border.all(color: AppTheme.getBorderColor(brightness)),
                                          ),
                                          child: Icon(
                                            CupertinoIcons.pencil,
                                            size: 16,
                                            color: AppTheme.getForegroundColor(brightness),
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
            
            // Bottom Add Button
            Positioned(
              left: 24,
              right: 24,
              bottom: 24,
              child: CupertinoButton(
                color: CupertinoColors.white,
                borderRadius: BorderRadius.circular(30),
                padding: const EdgeInsets.symmetric(vertical: 16),
                onPressed: _openAddCost,
                child: const Text(
                  'Add',
                  style: TextStyle(
                    color: CupertinoColors.black,
                    fontWeight: FontWeight.w600,
                    fontSize: 17,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

}

/// Screen for editing an existing cost
class EditCostScreen extends StatefulWidget {
  final ShowCost cost;

  const EditCostScreen({
    super.key,
    required this.cost,
  });

  @override
  State<EditCostScreen> createState() => _EditCostScreenState();
}

class _EditCostScreenState extends State<EditCostScreen> {
  late final TextEditingController _nameController;
  late final TextEditingController _amountController;
  late final TextEditingController _notesController;
  late String _selectedCurrency;
  bool _isLoading = false;

  final List<String> _currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'CHF', 'JPY'];

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.cost.name);
    _amountController = TextEditingController(text: widget.cost.amount.toStringAsFixed(2));
    _notesController = TextEditingController(text: widget.cost.notes ?? '');
    _selectedCurrency = widget.cost.currency;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _saveCost() async {
    final name = _nameController.text.trim();
    final amountStr = _amountController.text.trim();
    final notes = _notesController.text.trim();

    if (name.isEmpty) {
      _showError('Please enter a name');
      return;
    }

    if (amountStr.isEmpty) {
      _showError('Please enter an amount');
      return;
    }

    final amount = double.tryParse(amountStr);
    if (amount == null) {
      _showError('Invalid amount');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final supabase = Supabase.instance.client;
      final response = await supabase.rpc('update_show_cost', params: {
        'p_cost_id': widget.cost.id,
        'p_name': name,
        'p_amount': amount,
        'p_currency': _selectedCurrency,
        'p_notes': notes.isNotEmpty ? notes : null,
      });

      if (response != null && mounted) {
        final updated = ShowCost.fromJson(response as Map<String, dynamic>);
        Navigator.of(context).pop(updated);
      } else if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      print('Error updating cost: $e');
      if (mounted) {
        _showError('Failed to save cost');
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
          'Edit Cost',
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
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: _isLoading ? null : _saveCost,
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
        ),
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Name',
                style: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              CupertinoTextField(
                controller: _nameController,
                placeholder: 'e.g., Equipment rental',
                placeholderStyle: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                ),
                style: TextStyle(
                  color: AppTheme.getForegroundColor(brightness),
                  fontSize: 16,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.getCardColor(brightness),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.getCardBorderColor(brightness)),
                ),
                padding: const EdgeInsets.all(16),
              ),

              const SizedBox(height: 24),

              Text(
                'Amount',
                style: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              CupertinoTextField(
                controller: _amountController,
                placeholder: '0.00',
                placeholderStyle: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                ),
                style: TextStyle(
                  color: AppTheme.getForegroundColor(brightness),
                  fontSize: 16,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.getCardColor(brightness),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.getCardBorderColor(brightness)),
                ),
                padding: const EdgeInsets.all(16),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
                ],
              ),

              const SizedBox(height: 24),

              Text(
                'Currency',
                style: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: () => _showCurrencyPicker(context, brightness),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.getCardColor(brightness),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.getCardBorderColor(brightness)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _selectedCurrency,
                        style: TextStyle(
                          color: AppTheme.getForegroundColor(brightness),
                          fontSize: 16,
                        ),
                      ),
                      Icon(
                        CupertinoIcons.chevron_down,
                        color: AppTheme.getMutedForegroundColor(brightness),
                        size: 16,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              Text(
                'Notes (optional)',
                style: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              CupertinoTextField(
                controller: _notesController,
                placeholder: 'Add any notes...',
                placeholderStyle: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                ),
                style: TextStyle(
                  color: AppTheme.getForegroundColor(brightness),
                  fontSize: 16,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.getCardColor(brightness),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.getCardBorderColor(brightness)),
                ),
                padding: const EdgeInsets.all(16),
                maxLines: 3,
              ),
            ],
          ),
        ),
      ),
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

/// Screen for adding a new cost
class AddCostScreen extends StatefulWidget {
  final String showId;
  final String orgId;

  const AddCostScreen({
    super.key,
    required this.showId,
    required this.orgId,
  });

  @override
  State<AddCostScreen> createState() => _AddCostScreenState();
}

class _AddCostScreenState extends State<AddCostScreen> {
  final _nameController = TextEditingController();
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();
  String _selectedCurrency = 'USD';
  bool _isLoading = false;

  final List<String> _currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'SEK', 'NOK', 'DKK', 'CHF', 'JPY'];

  @override
  void dispose() {
    _nameController.dispose();
    _amountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _saveCost() async {
    final name = _nameController.text.trim();
    final amountStr = _amountController.text.trim();
    final notes = _notesController.text.trim();

    if (name.isEmpty) {
      _showError('Please enter a name');
      return;
    }

    if (amountStr.isEmpty) {
      _showError('Please enter an amount');
      return;
    }

    final amount = double.tryParse(amountStr);
    if (amount == null) {
      _showError('Invalid amount');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final supabase = Supabase.instance.client;
      final response = await supabase.rpc('create_show_cost', params: {
        'p_show_id': widget.showId,
        'p_org_id': widget.orgId,
        'p_name': name,
        'p_amount': amount,
        'p_currency': _selectedCurrency,
        'p_notes': notes.isNotEmpty ? notes : null,
      });

      if (response != null && mounted) {
        final newCost = ShowCost.fromJson(response as Map<String, dynamic>);
        Navigator.of(context).pop(newCost);
      } else if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      print('Error saving cost: $e');
      if (mounted) {
        _showError('Failed to save cost');
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
          'Add Cost',
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
        trailing: CupertinoButton(
          padding: EdgeInsets.zero,
          onPressed: _isLoading ? null : _saveCost,
          child: _isLoading
              ? CupertinoActivityIndicator(
                  color: AppTheme.getForegroundColor(brightness),
                )
              : Text(
                  'Add',
                  style: TextStyle(
                    color: AppTheme.getPrimaryColor(brightness),
                    fontWeight: FontWeight.w600,
                  ),
                ),
        ),
      ),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Name field
              Text(
                'Name',
                style: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              CupertinoTextField(
                controller: _nameController,
                placeholder: 'e.g., Equipment rental',
                placeholderStyle: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                ),
                style: TextStyle(
                  color: AppTheme.getForegroundColor(brightness),
                  fontSize: 16,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.getCardColor(brightness),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.getCardBorderColor(brightness)),
                ),
                padding: const EdgeInsets.all(16),
              ),

              const SizedBox(height: 24),

              // Amount field
              Text(
                'Amount',
                style: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              CupertinoTextField(
                controller: _amountController,
                placeholder: '0.00',
                placeholderStyle: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                ),
                style: TextStyle(
                  color: AppTheme.getForegroundColor(brightness),
                  fontSize: 16,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.getCardColor(brightness),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.getCardBorderColor(brightness)),
                ),
                padding: const EdgeInsets.all(16),
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                inputFormatters: [
                  FilteringTextInputFormatter.allow(RegExp(r'^\d*\.?\d{0,2}')),
                ],
              ),

              const SizedBox(height: 24),

              // Currency selector
              Text(
                'Currency',
                style: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: () => _showCurrencyPicker(context, brightness),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppTheme.getCardColor(brightness),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppTheme.getCardBorderColor(brightness)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        _selectedCurrency,
                        style: TextStyle(
                          color: AppTheme.getForegroundColor(brightness),
                          fontSize: 16,
                        ),
                      ),
                      Icon(
                        CupertinoIcons.chevron_down,
                        color: AppTheme.getMutedForegroundColor(brightness),
                        size: 16,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 24),

              // Notes field
              Text(
                'Notes (optional)',
                style: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const SizedBox(height: 8),
              CupertinoTextField(
                controller: _notesController,
                placeholder: 'Add any notes...',
                placeholderStyle: TextStyle(
                  color: AppTheme.getMutedForegroundColor(brightness),
                ),
                style: TextStyle(
                  color: AppTheme.getForegroundColor(brightness),
                  fontSize: 16,
                ),
                decoration: BoxDecoration(
                  color: AppTheme.getCardColor(brightness),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: AppTheme.getCardBorderColor(brightness)),
                ),
                padding: const EdgeInsets.all(16),
                maxLines: 3,
              ),
            ],
          ),
        ),
      ),
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
