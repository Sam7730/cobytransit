import importlib.util
import pathlib
import unittest
spec=importlib.util.spec_from_file_location('monitor',pathlib.Path(__file__).resolve().parents[1]/'scripts/check-sources.py')
monitor=importlib.util.module_from_spec(spec);spec.loader.exec_module(monitor)
class MonitorTests(unittest.TestCase):
    def test_html_ignores_scripts_but_detects_schedule_changes(self):
        body='<h1>Route 2 timetable</h1><p>'+('Published stop information. '*12)+'</p><td>8:30 AM</td>'
        original=monitor.semantic_content((body+'<script>token="one"</script>').encode(),'page')
        self.assertEqual(original,monitor.semantic_content((body+'<script>token="two"</script>').encode(),'page'))
        self.assertNotEqual(original,monitor.semantic_content(body.replace('8:30','8:45').encode(),'page'))
    def test_map_ignores_image_tokens_but_detects_coordinates_and_names(self):
        kml='<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Style><IconStyle><Icon><href>https://example.com/one</href></Icon></IconStyle></Style><Placemark><name>Board here</name><Point><coordinates>-74.48,42.67,0</coordinates></Point></Placemark></Document></kml>'
        original=monitor.semantic_content(kml.encode(),'map')
        self.assertEqual(original,monitor.semantic_content(kml.replace('/one','/two').encode(),'map'))
        for old,new in [('42.67','42.68'),('Board here','New stop')]: self.assertNotEqual(original,monitor.semantic_content(kml.replace(old,new).encode(),'map'))
    def test_invalid_sources_fail_instead_of_approving_empty_pages(self):
        for raw,kind in [(b'Not found','page'),(b'<kml/>','map'),(b'invalid XML','map')]:
            with self.assertRaises(Exception): monitor.semantic_content(raw,kind)
if __name__=='__main__': unittest.main()
